import { NextResponse } from "next/server"

import { getAuthUser, isPremiumActive, serializeAuthUser } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import {
  assertRateLimit,
  getRequestIdentifier,
  isRateLimitError,
} from "@/lib/rate-limit"
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
    } | null
    const code = normalizeCode(body?.code)

    if (!code) {
      return NextResponse.json(
        { error: "Voucher code is required" },
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
    if (isPremiumActive(user)) {
      return NextResponse.json(
        { error: "Subscription is already active" },
        { status: 409 }
      )
    }

    const voucher = await Voucher.findOne({ code })

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

    const currentPremiumUntil = user.premiumUntil
      ? new Date(user.premiumUntil)
      : null
    const nextPremiumUntil =
      currentPremiumUntil && currentPremiumUntil > privateUntil
        ? currentPremiumUntil
        : privateUntil

    user.isPremium = true
    user.premiumUntil = nextPremiumUntil
    user.premiumPrivateDomainLimit = Math.max(
      1,
      user.premiumPrivateDomainLimit ?? 0,
      voucher.privateDomainLimit ?? 1
    )

    await Promise.all([
      Voucher.updateOne(
        { _id: voucher._id },
        {
          $inc: { usedCount: 1 },
          $push: {
            redemptions: {
              userId: user._id,
              redeemedAt: new Date(),
              privateUntil,
            },
          },
        }
      ),
      user.save(),
    ])

    return NextResponse.json({
      ok: true,
      user: serializeAuthUser(user),
    })
  } catch (error) {
    if (isRateLimitError(error)) {
      return NextResponse.json({ error: error.message }, { status: 429 })
    }

    throw error
  }
}
