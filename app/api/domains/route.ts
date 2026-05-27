import { resolveMx } from "node:dns/promises"
import { NextResponse } from "next/server"

import { getAuthUser } from "@/lib/auth"
import { connectDB, hasMongoConfig } from "@/lib/db"
import { canSeeDomain } from "@/lib/domain-access"
import { resolveDomainSource } from "@/lib/domain-source"
import {
  getMxVerificationError,
  isValidDomain,
  MAIL_SERVER_HOST,
  normalizeDnsHost,
  normalizeDomain,
} from "@/lib/domain-validation"
import { syncSystemDomainsFromEmailApi } from "@/lib/system-domains"
import { mockDomains } from "@/mock/domains"
import { Domain as DomainModel } from "@/models/domain.model"

// GET /api/domains — semua domain dibaca dari MongoDB.
// Kalau belum ada system domain di DB, import sekali dari backend email API.
export async function GET() {
  try {
    const auth = await getAuthUser()

    if (!hasMongoConfig()) {
      return NextResponse.json(
        mockDomains
          .filter((domain) => canSeeDomain(domain, auth?.userId ?? null))
          .map((domain) => ({
            ...domain,
            visibility: domain.visibility ?? "public",
            privateUntil: domain.privateUntil ?? null,
            isBanned: domain.isBanned ?? false,
            isOwnedByUser: Boolean(domain.isOwnedByUser),
            source: resolveDomainSource(domain),
          }))
      )
    }

    await connectDB()

    const systemCount = await DomainModel.countDocuments({ type: "system" })
    if (systemCount === 0) {
      await syncSystemDomainsFromEmailApi()
    }

    const domains = await DomainModel.find({}).sort({ type: 1, name: 1 }).lean()
    const authUserId = auth?.userId ?? null
    const privateDomainOwners = new Map<string, string | null>()

    for (const domain of domains) {
      if (
        domain.visibility === "private" &&
        domain.isVerified &&
        !domain.isBanned
      ) {
        privateDomainOwners.set(domain.name, domain.userId?.toString() ?? null)
      }
    }

    return NextResponse.json(
      domains
        .filter((domain) => {
          const privateOwnerId = privateDomainOwners.get(domain.name)

          if (privateOwnerId !== undefined) {
            return Boolean(
              authUserId && domain.userId?.toString() === authUserId
            )
          }

          return canSeeDomain(domain, authUserId)
        })
        .map((domain) => ({
          id: domain._id.toString(),
          name: domain.name,
          type: domain.type,
          source: resolveDomainSource(domain),
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

// POST /api/domains — tambah domain custom (user login) atau guest domain (anon)
export async function POST(req: Request) {
  const auth = await getAuthUser()

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
    source: auth ? "user" : "guest",
    userId: auth?.userId ?? null,
  })

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
    isOwnedByUser: Boolean(auth),
  })
}
