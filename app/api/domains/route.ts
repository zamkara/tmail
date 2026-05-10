import { resolveMx } from "node:dns/promises"
import { NextResponse } from "next/server"

import { getAuthUser } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { canSeeDomain } from "@/lib/domain-access"
import {
  getMxVerificationError,
  isValidDomain,
  MAIL_SERVER_HOST,
  normalizeDnsHost,
  normalizeDomain,
} from "@/lib/domain-validation"
import { syncSystemDomainsFromEmailApi } from "@/lib/system-domains"
import { Domain as DomainModel } from "@/models/domain.model"

// GET /api/domains — semua domain dibaca dari MongoDB.
// Kalau belum ada system domain di DB, import sekali dari backend email API.
export async function GET() {
  try {
    const auth = await getAuthUser()

    await connectDB()

    const systemCount = await DomainModel.countDocuments({ type: "system" })
    if (systemCount === 0) {
      await syncSystemDomainsFromEmailApi()
    }

    const domains = await DomainModel.find({}).sort({ type: 1, name: 1 }).lean()

    return NextResponse.json(
      domains
        .filter((domain) => canSeeDomain(domain, auth?.userId ?? null))
        .map((domain) => ({
          id: domain._id.toString(),
          name: domain.name,
          type: domain.type,
          addedAt: domain.createdAt,
          isVerified: domain.isVerified,
          visibility: domain.visibility ?? "public",
          privateUntil: domain.privateUntil,
          isBanned: domain.isBanned ?? false,
          isOwnedByUser: Boolean(
            auth?.userId && domain.userId?.toString() === auth.userId
          ),
        }))
    )
  } catch (error) {
    console.error("[domains:get]", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load domains",
      },
      { status: 500 }
    )
  }
}

// POST /api/domains — tambah domain custom (butuh auth)
export async function POST(req: Request) {
  const auth = await getAuthUser()
  if (!auth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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

  const existing = await DomainModel.findOne({ name: normalized })
  if (existing) {
    return NextResponse.json(
      { error: "Domain already registered" },
      { status: 409 }
    )
  }

  const domain = await DomainModel.create({
    name: normalized,
    type: "custom",
    isVerified: true,
    visibility: "public",
    privateUntil: null,
    userId: auth.userId,
  })

  return NextResponse.json({
    id: domain._id.toString(),
    name: domain.name,
    type: domain.type,
    isVerified: domain.isVerified,
    addedAt: domain.createdAt,
    visibility: domain.visibility ?? "public",
    privateUntil: domain.privateUntil,
    isBanned: domain.isBanned ?? false,
    isOwnedByUser: true,
  })
}
