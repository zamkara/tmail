import { randomBytes } from "node:crypto"
import { NextResponse } from "next/server"

import { isAdminRequest } from "@/lib/admin-session"
import { connectDB } from "@/lib/db"
import { Voucher } from "@/models/voucher.model"

function makeCode(prefix?: string) {
  const suffix = randomBytes(4).toString("hex").toUpperCase()
  return prefix ? `${prefix}-${suffix}` : `TMAIL-${suffix}`
}

export async function POST(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as {
    code?: unknown
    durationDays?: unknown
    maxUses?: unknown
    expiresAt?: unknown
    note?: unknown
    count?: unknown
  } | null

  const durationDays =
    typeof body?.durationDays === "number" ? Math.max(1, body.durationDays) : 30
  const maxUses =
    typeof body?.maxUses === "number" ? Math.max(1, body.maxUses) : 1
  const expiresAtRaw =
    typeof body?.expiresAt === "string" && body.expiresAt.trim()
      ? new Date(body.expiresAt)
      : new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000)

  if (Number.isNaN(expiresAtRaw.getTime())) {
    return NextResponse.json({ error: "Invalid expiry date" }, { status: 400 })
  }

  const count = typeof body?.count === "number" ? Math.max(1, Math.min(body.count, 100)) : 1
  const baseNote = typeof body?.note === "string" ? body.note : ""

  await connectDB()
  const vouchers = []

  const codePrefix =
    typeof body?.code === "string" ? body.code.trim().toUpperCase() : ""

  for (let i = 0; i < count; i++) {
    const code = codePrefix ? makeCode(codePrefix) : makeCode()

    const voucher = await Voucher.create({
      code,
      durationDays,
      maxUses,
      expiresAt: expiresAtRaw,
      isActive: true,
      note: count > 1 ? `${baseNote} #${i + 1}` : baseNote,
    })

    vouchers.push({
      id: voucher._id.toString(),
      code: voucher.code,
      durationDays: voucher.durationDays,
      maxUses: voucher.maxUses,
      usedCount: voucher.usedCount,
      expiresAt: voucher.expiresAt,
      isActive: voucher.isActive,
      note: voucher.note,
      createdAt: voucher.createdAt,
    })
  }

  return NextResponse.json({ vouchers })
}
