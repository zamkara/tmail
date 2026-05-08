import { resolveMx } from "node:dns/promises"
import mongoose from "mongoose"
import { NextResponse } from "next/server"

import { getAuthUser } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import {
  getMxVerificationError,
  isValidDomain,
  MAIL_SERVER_HOST,
  normalizeDnsHost,
  normalizeDomain,
} from "@/lib/domain-validation"
import { Domain } from "@/models/domain.model"

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

  const { name } = await req.json()
  const normalized = normalizeDomain(name)

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

  await connectDB()

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

  const domain = await Domain.findOneAndUpdate(
    { _id: domainId, userId: auth.userId, type: "custom" },
    { name: normalized, isVerified: true },
    { new: true }
  )

  if (!domain) {
    return NextResponse.json(
      { error: "Domain tidak ditemukan" },
      { status: 404 }
    )
  }

  return NextResponse.json({
    id: domain._id.toString(),
    name: domain.name,
    type: domain.type,
    isVerified: domain.isVerified,
    addedAt: domain.createdAt,
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

  return NextResponse.json({ ok: true })
}
