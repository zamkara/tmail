import mongoose from "mongoose"
import { NextResponse } from "next/server"

import { getAdminSettings } from "@/lib/admin-settings"
import {
  ensureAddressIndexes,
  findAddressConflict,
} from "@/lib/address-ownership"
import { isAdminRequest } from "@/lib/admin-session"
import { connectDB } from "@/lib/db"
import { Address } from "@/models/address.model"
import { Domain } from "@/models/domain.model"
import { User } from "@/models/user.model"

function normalizeAddress(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ addressId: string }> }
) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { addressId } = await params
  if (!mongoose.isValidObjectId(addressId)) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 })
  }

  const body = (await req.json().catch(() => null)) as {
    address?: unknown
    userId?: unknown
    domainId?: unknown
    expiresAt?: unknown
  } | null
  const patch: Record<string, unknown> = {}
  let nextDomainName: string | null = null
  let nextAddressValue: string | null = null

  await connectDB()
  await ensureAddressIndexes()
  const settings = await getAdminSettings()

  if (typeof body?.userId === "string") {
    const user = await User.findById(body.userId).lean()
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    patch.userId = body.userId
  }

  if (typeof body?.domainId === "string") {
    const domain = await Domain.findById(body.domainId).lean()
    if (!domain)
      return NextResponse.json({ error: "Domain not found" }, { status: 404 })
    patch.domainId = body.domainId
    nextDomainName = domain.name
  }

  if (typeof body?.expiresAt === "string") {
    const expiresAt = new Date(body.expiresAt)
    if (Number.isNaN(expiresAt.getTime())) {
      return NextResponse.json(
        { error: "Invalid expiry date" },
        { status: 400 }
      )
    }
    patch.expiresAt = expiresAt
  }

  if (typeof body?.address === "string") {
    const address = normalizeAddress(body.address)
    if (!address || !address.includes("@")) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 })
    }
    patch.address = address
    nextAddressValue = address
  }

  if (nextAddressValue || nextDomainName) {
    const current = await Address.findById(addressId).lean()
    if (!current) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 })
    }

    const domainName =
      nextDomainName ??
      (await Domain.findById(current.domainId).lean())?.name ??
      null
    const addressValue = nextAddressValue ?? current.address

    if (!domainName || addressValue.split("@")[1] !== domainName) {
      return NextResponse.json(
        { error: `Address must use ${domainName ?? "selected domain"}` },
        { status: 400 }
      )
    }

    const effectiveUserId =
      typeof body?.userId === "string" ? body.userId : current.userId.toString()
    const effectiveDomain =
      typeof body?.domainId === "string"
        ? await Domain.findById(body.domainId).lean()
        : await Domain.findById(current.domainId).lean()

    if (!effectiveDomain) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 })
    }

    const conflict = await findAddressConflict({
      address: addressValue,
      userId: effectiveUserId,
      settings,
      domain: effectiveDomain,
      excludeAddressId: addressId,
    })

    if (conflict) {
      return NextResponse.json(
        { error: "Email address is already taken" },
        { status: 409 }
      )
    }
  }

  const nextAddress = await Address.findByIdAndUpdate(addressId, patch, {
    returnDocument: "after",
  }).lean()

  if (!nextAddress) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 })
  }

  return NextResponse.json({
    id: nextAddress._id.toString(),
    address: nextAddress.address,
    userId: nextAddress.userId.toString(),
    domainId: nextAddress.domainId.toString(),
    expiresAt: nextAddress.expiresAt,
    createdAt: nextAddress.createdAt,
    updatedAt: nextAddress.updatedAt,
  })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ addressId: string }> }
) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { addressId } = await params
  if (!mongoose.isValidObjectId(addressId)) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 })
  }

  await connectDB()
  const address = await Address.findByIdAndDelete(addressId)
  if (!address) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
