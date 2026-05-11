import { NextResponse } from "next/server"

import { getAdminSettings } from "@/lib/admin-settings"
import { getAuthUser } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { canUseDomain } from "@/lib/domain-access"
import { Address } from "@/models/address.model"
import { Domain } from "@/models/domain.model"
import { User } from "@/models/user.model"
import {
  assertRateLimit,
  getRequestIdentifier,
  isRateLimitError,
} from "@/lib/rate-limit"

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function serializeAddresses(
  addresses: Array<{
    _id: { toString(): string }
    address: string
    domainId: { toString(): string }
    createdAt: Date
    expiresAt: Date
  }>,
  username: string
) {
  return addresses.map((address) => ({
    id: address._id.toString(),
    address: address.address,
    domainId: address.domainId.toString(),
    domainName: address.address.split("@")[1] ?? "",
    username,
    createdAt: address.createdAt,
    expiresAt: address.expiresAt,
  }))
}

// GET /api/addresses — ambil semua address milik user yang belum expired
export async function GET() {
  const auth = await getAuthUser()
  if (!auth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await connectDB()

  const user = await User.findById(auth.userId)
  if (!user)
    return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 })

  const addresses = await Address.find({
    userId: auth.userId,
    expiresAt: { $gt: new Date() },
  }).lean()
  const username = slugify(user.name)

  return NextResponse.json(serializeAddresses(addresses, username))
}

// POST /api/addresses — generate address baru untuk domain tertentu
export async function POST(req: Request) {
  try {
    await assertRateLimit({
      action: "address-create",
      identifier: getRequestIdentifier(req),
      limit: 30,
      windowSeconds: 60,
    })

    const auth = await getAuthUser()
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { domainId } = await req.json()
    if (!domainId)
      return NextResponse.json(
        { error: "domainId wajib diisi" },
        { status: 400 }
      )

    await connectDB()
    const settings = await getAdminSettings()
    const now = new Date()

    const domain = await Domain.findById(domainId)

    if (!domain || !canUseDomain(domain, auth.userId)) {
      return NextResponse.json(
        { error: "Domain tidak tersedia" },
        { status: 404 }
      )
    }

    const user = await User.findById(auth.userId)
    if (!user)
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 }
      )
    if (user.isBanned) {
      return NextResponse.json(
        { error: user.banReason ?? "Account is banned" },
        { status: 403 }
      )
    }

    const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
    const random = Array.from(
      { length: 6 },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join("")

    await Address.updateMany(
      {
        userId: auth.userId,
        domainId: domain._id,
        expiresAt: { $gt: now },
      },
      { $set: { expiresAt: now } }
    )

    const remainingActiveAddresses = await Address.find({
      userId: auth.userId,
      expiresAt: { $gt: now },
    })
      .sort({ createdAt: 1, _id: 1 })
      .lean()

    const overflowCount =
      remainingActiveAddresses.length - settings.maxAddressesPerUser + 1

    if (overflowCount > 0) {
      const addressIdsToExpire = remainingActiveAddresses
        .slice(0, overflowCount)
        .map((address) => address._id)

      await Address.updateMany(
        { _id: { $in: addressIdsToExpire } },
        { $set: { expiresAt: now } }
      )
    }

    const expiresAt = new Date(
      now.getTime() + settings.addressTtlHours * 60 * 60 * 1000
    )

    const address = await Address.create({
      address: `${random}@${domain.name}`,
      domainId: domain._id,
      userId: auth.userId,
      expiresAt,
    })
    const refreshedAddresses = await Address.find({
      userId: auth.userId,
      expiresAt: { $gt: now },
    }).lean()
    const username = slugify(user.name)

    return NextResponse.json({
      address: {
        id: address._id.toString(),
        address: address.address,
        domainId: address.domainId.toString(),
        domainName: domain.name,
        username,
        createdAt: address.createdAt,
        expiresAt: address.expiresAt,
      },
      activeAddresses: serializeAddresses(refreshedAddresses, username),
    })
  } catch (error) {
    if (isRateLimitError(error)) {
      return NextResponse.json({ error: error.message }, { status: 429 })
    }

    throw error
  }
}
