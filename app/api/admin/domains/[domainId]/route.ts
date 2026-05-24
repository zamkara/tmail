import mongoose from "mongoose"
import { NextResponse } from "next/server"

import { isAdminRequest } from "@/lib/admin-session"
import { connectDB } from "@/lib/db"
import { isValidDomain, normalizeDomain } from "@/lib/domain-validation"
import { resolveDomainSource } from "@/lib/domain-source"
import { Address } from "@/models/address.model"
import { Domain } from "@/models/domain.model"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ domainId: string }> }
) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { domainId } = await params
  if (!mongoose.isValidObjectId(domainId)) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 })
  }

  const body = (await req.json().catch(() => null)) as {
    name?: unknown
    type?: unknown
    source?: unknown
    isVerified?: unknown
    visibility?: unknown
    privateUntil?: unknown
    isBanned?: unknown
    banReason?: unknown
  } | null

  await connectDB()
  const existingDomain = await Domain.findById(domainId).lean()

  if (!existingDomain) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 })
  }

  const patch: Record<string, unknown> = {}

  if (typeof body?.name === "string") {
    const name = normalizeDomain(body.name)
    if (!name || !isValidDomain(name)) {
      return NextResponse.json({ error: "Invalid domain" }, { status: 400 })
    }
    patch.name = name
  }

  if (body?.source === "system" || body?.source === "guest") {
    patch.source = body.source
    patch.type = body.source === "system" ? "system" : "custom"
    patch.userId = null
    if (body.source === "system") {
      patch.visibility = "public"
      patch.privateUntil = null
    }
    if (body.source === "guest") {
      patch.visibility = "public"
      patch.privateUntil = null
    }
  } else if (body?.type === "system" || body?.type === "custom") {
    patch.type = body.type
    if (body.type === "system") {
      patch.userId = null
      patch.source = "system"
      patch.visibility = "public"
      patch.privateUntil = null
    }
  }

  if (typeof body?.isVerified === "boolean") {
    patch.isVerified = body.isVerified
  }

  if (body?.visibility === "public" || body?.visibility === "private") {
    const currentSource =
      (patch.source as string | undefined) ?? resolveDomainSource(existingDomain)

    if (currentSource === "system" || currentSource === "guest") {
      patch.visibility = "public"
      patch.privateUntil = null
    } else {
      patch.visibility = body.visibility
      if (body.visibility === "public") patch.privateUntil = null
    }
  }

  if (typeof body?.privateUntil === "string") {
    const privateUntil = body.privateUntil ? new Date(body.privateUntil) : null
    if (privateUntil && Number.isNaN(privateUntil.getTime())) {
      return NextResponse.json(
        { error: "Invalid private expiry" },
        { status: 400 }
      )
    }
    patch.privateUntil = privateUntil
  }

  if (typeof body?.isBanned === "boolean") {
    patch.isBanned = body.isBanned
  }

  if (typeof body?.banReason === "string") {
    patch.banReason = body.banReason
  }

  const nextVisibility =
    (patch.visibility as "public" | "private" | undefined) ??
    existingDomain.visibility ??
    "public"
  const nextUserId = patch.userId ?? existingDomain.userId ?? null
  const nextSource =
    (patch.source as "system" | "user" | "guest" | undefined) ??
    resolveDomainSource(existingDomain)

  if (nextSource !== "user" && nextVisibility === "private") {
    return NextResponse.json(
      { error: "Only user-owned domains can be private" },
      { status: 400 }
    )
  }

  if (nextVisibility === "private") {
    patch.type = "custom"

    if (!nextUserId) {
      return NextResponse.json(
        { error: "Private domains must belong to a user account" },
        { status: 400 }
      )
    }
  }

  const domain = await Domain.findByIdAndUpdate(domainId, patch, {
    returnDocument: "after",
  }).lean()

  return NextResponse.json({
    id: domain._id.toString(),
    name: domain.name,
    type: domain.type,
    source: resolveDomainSource(domain),
    isVerified: domain.isVerified,
    visibility: domain.visibility ?? "public",
    privateUntil: domain.privateUntil,
    isBanned: domain.isBanned ?? false,
    banReason: domain.banReason ?? "",
    createdAt: domain.createdAt,
    updatedAt: domain.updatedAt,
  })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ domainId: string }> }
) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { domainId } = await params
  if (!mongoose.isValidObjectId(domainId)) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 })
  }

  await connectDB()
  const domain = await Domain.findByIdAndDelete(domainId)
  if (!domain) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 })
  }

  await Address.deleteMany({ domainId })

  return NextResponse.json({ ok: true })
}
