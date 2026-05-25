import { NextResponse } from "next/server"

import {
  getAuthUser,
  getPremiumPrivateDomainLimit,
  isPremiumActive,
  serializeAuthUser,
} from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { Domain } from "@/models/domain.model"
import { User } from "@/models/user.model"

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await getAuthUser()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await connectDB()

  const user = await User.findById(auth.userId)
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const now = new Date()
  const privateDomainUsage = await Domain.countDocuments({
    userId: auth.userId,
    type: "custom",
    visibility: "private",
    privateUntil: { $gt: now },
  })
  const privateDomainLimit = getPremiumPrivateDomainLimit(user)

  return NextResponse.json({
    user: serializeAuthUser(user),
    subscription: {
      isPremium: isPremiumActive(user),
      premiumUntil: user.premiumUntil,
      privateDomainUsage,
      privateDomainLimit,
      privateDomainRemaining: Math.max(0, privateDomainLimit - privateDomainUsage),
    },
  })
}

export async function DELETE() {
  const auth = await getAuthUser()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await connectDB()

  const user = await User.findById(auth.userId)
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  user.isPremium = false
  user.premiumUntil = null
  user.premiumPrivateDomainLimit = 0

  await Promise.all([
    user.save(),
    Domain.updateMany(
      {
        userId: auth.userId,
        type: "custom",
        visibility: "private",
      },
      {
        $set: { visibility: "public", privateUntil: null },
      }
    ),
  ])

  return NextResponse.json({
    user: serializeAuthUser(user),
    subscription: {
      isPremium: false,
      premiumUntil: null,
      privateDomainUsage: 0,
      privateDomainLimit: 0,
      privateDomainRemaining: 0,
    },
  })
}
