import { resolveMx } from "node:dns/promises"
import mongoose from "mongoose"
import { NextResponse } from "next/server"

import {
  getAuthUser,
  getPremiumPrivateDomainLimit,
  isPremiumActive,
} from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { resolveDomainSource } from "@/lib/domain-source"
import {
  getMxVerificationError,
  isValidDomain,
  MAIL_SERVER_HOST,
  normalizeDnsHost,
  normalizeDomain,
} from "@/lib/domain-validation"
import { Address } from "@/models/address.model"
import { Domain } from "@/models/domain.model"
import { User } from "@/models/user.model"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ domainId: string }> }
) {
  const auth = await getAuthUser()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { domainId } = await params
  if (!mongoose.isValidObjectId(domainId)) {
    return NextResponse.json(
      { error: "Domain tidak ditemukan" },
      { status: 404 }
    )
  }

  const body = (await req.json().catch(() => null)) as {
    name?: unknown
    visibility?: unknown
  } | null

  await connectDB()
  const domain = await Domain.findOne({
    _id: domainId,
    userId: auth.userId,
    type: "custom",
  })

  if (!domain) {
    return NextResponse.json(
      { error: "Domain tidak ditemukan" },
      { status: 404 }
    )
  }

  if (typeof body?.name === "string") {
    const normalized = normalizeDomain(body.name)

    if (!normalized || !isValidDomain(normalized)) {
      return NextResponse.json(
        { error: "Format domain tidak valid" },
        { status: 400 }
      )
    }

    const expected = normalizeDnsHost(MAIL_SERVER_HOST)
    const records = await resolveMx(normalized).catch(() => [])
    const verificationError = getMxVerificationError(records, expected)

    if (verificationError) {
      return NextResponse.json({ error: verificationError }, { status: 400 })
    }

    const duplicate = await Domain.findOne({
      _id: { $ne: domainId },
      name: normalized,
    })
    if (duplicate) {
      return NextResponse.json(
        { error: "Domain already registered" },
        { status: 409 }
      )
    }

    domain.name = normalized
    domain.isVerified = true
  }

  if (body?.visibility === "public" || body?.visibility === "private") {
    if (body.visibility === "private") {
      const user = await User.findById(auth.userId)
      if (!user || !isPremiumActive(user)) {
        return NextResponse.json(
          { error: "Premium subscription is required" },
          { status: 403 }
        )
      }

      const activePrivateCount = await Domain.countDocuments({
        _id: { $ne: domain._id },
        userId: auth.userId,
        type: "custom",
        visibility: "private",
        privateUntil: { $gt: new Date() },
      })
      const limit = getPremiumPrivateDomainLimit(user)

      if (activePrivateCount >= limit) {
        return NextResponse.json(
          { error: "Private domain usage limit reached" },
          { status: 403 }
        )
      }

      domain.privateUntil = user.premiumUntil
    } else {
      domain.privateUntil = null
    }

    domain.visibility = body.visibility
  }

  await domain.save()

  return NextResponse.json({
    id: domain._id.toString(),
    name: domain.name,
    type: domain.type,
    source: resolveDomainSource(domain),
    isVerified: domain.isVerified,
    addedAt: domain.createdAt,
    visibility: domain.visibility ?? "public",
    privateUntil: domain.privateUntil,
    isBanned: domain.isBanned ?? false,
    isOwnedByUser: true,
  })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ domainId: string }> }
) {
  const auth = await getAuthUser()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { domainId } = await params
  if (!mongoose.isValidObjectId(domainId)) {
    return NextResponse.json(
      { error: "Domain tidak ditemukan" },
      { status: 404 }
    )
  }

  await connectDB()

  const domain = await Domain.findOneAndDelete({
    _id: domainId,
    userId: auth.userId,
    type: "custom",
  })

  if (!domain) {
    return NextResponse.json(
      { error: "Domain tidak ditemukan" },
      { status: 404 }
    )
  }

  await Address.deleteMany({
    domainId: domain._id,
    userId: auth.userId,
  })

  return NextResponse.json({ ok: true })
}
