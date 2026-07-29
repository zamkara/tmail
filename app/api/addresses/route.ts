import { NextResponse } from "next/server"

import { getAdminSettings } from "@/lib/admin-settings"
import { isAdminRequest } from "@/lib/admin-session"
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

function normalizeSubdomain(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

function isValidSubdomain(value: string) {
  if (!value) return true

  return value
    .split(".")
    .every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
}

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
    const isAdminSession = await isAdminRequest()
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = (await req.json().catch(() => null)) as {
      domainId?: unknown
      subdomain?: unknown
    } | null
    const domainId = typeof body?.domainId === "string" ? body.domainId : ""
    const subdomain = normalizeSubdomain(body?.subdomain)
    if (!domainId)
      return NextResponse.json(
        { error: "domainId wajib diisi" },
        { status: 400 }
      )
    if (!isValidSubdomain(subdomain)) {
      return NextResponse.json(
        { error: "Format subdomain tidak valid" },
        { status: 400 }
      )
    }

    await connectDB()
    const settings = await getAdminSettings()
    const now = new Date()

    const domain = await Domain.findById(domainId)

    if (
      !domain ||
      !canUseDomain(domain, auth.userId, new Date(), { isAdminSession })
    ) {
      return NextResponse.json(
        { error: "Domain tidak tersedia" },
        { status: 404 }
      )
    }
    if (subdomain && settings.allowWildcardSubdomains === false) {
      return NextResponse.json(
        { error: "Wildcard subdomains are disabled" },
        { status: 403 }
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

    const chars = "abcdefghijklmnopqrstuvwxyz"
    const random = Array.from(
      { length: 7 },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join("")
    const resolvedDomainName = subdomain
      ? `${subdomain}.${domain.name}`
      : domain.name

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
      address: `${random}@${resolvedDomainName}`,
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
        domainName: resolvedDomainName,
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
