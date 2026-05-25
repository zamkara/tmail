import mongoose from "mongoose"
import { NextResponse } from "next/server"

import { isAdminRequest } from "@/lib/admin-session"
import { connectDB } from "@/lib/db"
import { Voucher } from "@/models/voucher.model"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ voucherId: string }> }
) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { voucherId } = await params
  if (!mongoose.isValidObjectId(voucherId)) {
    return NextResponse.json({ error: "Voucher not found" }, { status: 404 })
  }

  const body = (await req.json().catch(() => null)) as {
    durationDays?: unknown
    privateDomainLimit?: unknown
    maxUses?: unknown
    expiresAt?: unknown
    isActive?: unknown
    note?: unknown
  } | null
  const patch: Record<string, unknown> = {}

  if (typeof body?.durationDays === "number") {
    patch.durationDays = Math.max(1, Math.floor(body.durationDays))
  }
  if (typeof body?.privateDomainLimit === "number") {
    patch.privateDomainLimit = Math.max(
      1,
      Math.floor(body.privateDomainLimit)
    )
  } else if (typeof body?.maxUses === "number") {
    patch.privateDomainLimit = Math.max(1, Math.floor(body.maxUses))
  }
  if (typeof body?.maxUses === "number") {
    patch.maxUses = Math.max(1, Math.floor(body.maxUses))
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
  if (typeof body?.isActive === "boolean") patch.isActive = body.isActive
  if (typeof body?.note === "string") patch.note = body.note

  await connectDB()
  const voucher = await Voucher.findByIdAndUpdate(voucherId, patch, {
    returnDocument: "after",
  }).lean()

  if (!voucher) {
    return NextResponse.json({ error: "Voucher not found" }, { status: 404 })
  }

  return NextResponse.json({
    id: voucher._id.toString(),
    code: voucher.code,
    durationDays: voucher.durationDays,
    privateDomainLimit: voucher.privateDomainLimit,
    maxUses: voucher.maxUses,
    usedCount: voucher.usedCount,
    expiresAt: voucher.expiresAt,
    isActive: voucher.isActive,
    note: voucher.note,
    createdAt: voucher.createdAt,
  })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ voucherId: string }> }
) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { voucherId } = await params
  if (!mongoose.isValidObjectId(voucherId)) {
    return NextResponse.json({ error: "Voucher not found" }, { status: 404 })
  }

  await connectDB()
  const voucher = await Voucher.findByIdAndDelete(voucherId)
  if (!voucher) {
    return NextResponse.json({ error: "Voucher not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
