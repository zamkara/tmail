import { NextResponse } from "next/server"

import { getAuthUser } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import {
  assertRateLimit,
  getRequestIdentifier,
  isRateLimitError,
} from "@/lib/rate-limit"
import { Domain } from "@/models/domain.model"
import { Voucher } from "@/models/voucher.model"
import { User } from "@/models/user.model"

function normalizeCode(value: unknown) {
  return typeof value === "string" ? value.trim().toUpperCase() : ""
}

export async function POST(req: Request) {
  try {
    await assertRateLimit({
      action: "voucher-redeem",
      identifier: getRequestIdentifier(req),
      limit: 10,
      windowSeconds: 60,
    })

    const auth = await getAuthUser()
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = (await req.json().catch(() => null)) as {
      code?: unknown
      domainId?: unknown
    } | null
    const code = normalizeCode(body?.code)
    const domainId = typeof body?.domainId === "string" ? body.domainId : ""

    if (!code || !domainId) {
      return NextResponse.json(
        { error: "Voucher code and domain are required" },
        { status: 400 }
      )
    }

    await connectDB()

    const user = await User.findById(auth.userId)
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    if (user.isBanned) {
      return NextResponse.json(
        { error: user.banReason ?? "Account is banned" },
        { status: 403 }
      )
    }

    const [voucher, domain] = await Promise.all([
      Voucher.findOne({ code }),
      Domain.findOne({ _id: domainId, userId: auth.userId }),
    ])

    if (!domain)
      return NextResponse.json({ error: "Domain not found" }, { status: 404 })
    if (!voucher || !voucher.isActive) {
      return NextResponse.json(
        { error: "Voucher is not active" },
        { status: 400 }
      )
    }
    if (voucher.expiresAt <= new Date()) {
      return NextResponse.json({ error: "Voucher expired" }, { status: 400 })
    }
    if (voucher.usedCount >= voucher.maxUses) {
      return NextResponse.json(
        { error: "Voucher usage limit reached" },
        { status: 400 }
      )
    }

    const privateUntil = new Date(
      Date.now() + voucher.durationDays * 24 * 60 * 60 * 1000
    )

    voucher.usedCount += 1
    voucher.redemptions.push({
      userId: user._id,
      domainId: domain._id,
      redeemedAt: new Date(),
      privateUntil,
    })

    domain.visibility = "private"
    domain.privateUntil = privateUntil
    domain.isVerified = true

    await Promise.all([voucher.save(), domain.save()])

    return NextResponse.json({
      ok: true,
      domain: {
        id: domain._id.toString(),
        name: domain.name,
        visibility: domain.visibility,
        privateUntil: domain.privateUntil,
      },
    })
  } catch (error) {
    if (isRateLimitError(error)) {
      return NextResponse.json({ error: error.message }, { status: 429 })
    }

    throw error
  }
}
