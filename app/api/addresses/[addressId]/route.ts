import mongoose from "mongoose"
import { NextResponse } from "next/server"

import { getAdminSettings } from "@/lib/admin-settings"
import { getAuthUser } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { Address } from "@/models/address.model"
import { Domain } from "@/models/domain.model"
import { User } from "@/models/user.model"

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function normalizeLocalPart(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

function normalizeSubdomain(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

function isValidLocalPart(value: string) {
  return /^[a-z0-9][a-z0-9._-]{0,63}$/.test(value)
}

function isValidSubdomain(value: string) {
  if (!value) return true

  return value
    .split(".")
    .every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ addressId: string }> }
) {
  const auth = await getAuthUser()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { addressId } = await params
  if (!mongoose.isValidObjectId(addressId)) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 })
  }

  const body = (await req.json().catch(() => null)) as {
    localPart?: unknown
    subdomain?: unknown
  } | null
  const localPart = normalizeLocalPart(body?.localPart)
  const subdomain = normalizeSubdomain(body?.subdomain)

  if (!isValidLocalPart(localPart)) {
    return NextResponse.json(
      {
        error:
          "Use 1-64 characters: lowercase letters, numbers, dots, dashes, or underscores.",
      },
      { status: 400 }
    )
  }
  if (!isValidSubdomain(subdomain)) {
    return NextResponse.json(
      {
        error:
          "Use a valid subdomain with lowercase letters, numbers, or dashes.",
      },
      { status: 400 }
    )
  }

  await connectDB()
  const settings = await getAdminSettings()

  if (subdomain && settings.allowWildcardSubdomains === false) {
    return NextResponse.json(
      { error: "Wildcard subdomains are disabled" },
      { status: 403 }
    )
  }

  const current = await Address.findOne({
    _id: addressId,
    userId: auth.userId,
    expiresAt: { $gt: new Date() },
  }).lean()

  if (!current) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 })
  }

  const [domain, user] = await Promise.all([
    Domain.findById(current.domainId).lean(),
    User.findById(auth.userId).select("name").lean(),
  ])

  if (!domain || !user) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 })
  }

  const nextDomainName = subdomain ? `${subdomain}.${domain.name}` : domain.name
  const nextAddressValue = `${localPart}@${nextDomainName}`.toLowerCase()

  try {
    const nextAddress = await Address.findOneAndUpdate(
      { _id: addressId, userId: auth.userId },
      { $set: { address: nextAddressValue } },
      { returnDocument: "after" }
    ).lean()

    if (!nextAddress) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: nextAddress._id.toString(),
      address: nextAddress.address,
      domainId: nextAddress.domainId.toString(),
      domainName: nextDomainName,
      username: slugify(user.name),
      createdAt: nextAddress.createdAt,
      expiresAt: nextAddress.expiresAt,
    })
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { error: "Email address is already taken" },
        { status: 409 }
      )
    }

    throw error
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ addressId: string }> }
) {
  const auth = await getAuthUser()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { addressId } = await params
  if (!mongoose.isValidObjectId(addressId)) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 })
  }

  await connectDB()

  const deleted = await Address.findOneAndDelete({
    _id: addressId,
    userId: auth.userId,
  }).lean()

  if (!deleted) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true, id: addressId })
}
