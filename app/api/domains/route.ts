import { resolveMx } from "node:dns/promises"
import { NextResponse } from "next/server"

import { getAuthUser } from "@/lib/auth"
import { isAdminRequest } from "@/lib/admin-session"
import { connectDB, hasMongoConfig } from "@/lib/db"
import { canSeeDomain } from "@/lib/domain-access"
import { uniqueDomainsByName } from "@/lib/domain-list"
import { isSupportedBackendDomainStatus } from "@/lib/domain-support"
import { resolveDomainSource } from "@/lib/domain-source"
import {
  getMxVerificationError,
  isValidDomain,
  MAIL_SERVER_HOST,
  normalizeDnsHost,
  normalizeDomain,
} from "@/lib/domain-validation"
import {
  fetchEmailApiSystemDomains,
  filterSupportedEmailApiDomains,
  syncSystemDomainsFromEmailApi,
} from "@/lib/system-domains"
import { Domain as DomainModel } from "@/models/domain.model"
import { getBackendDomainStatus } from "@/services/backend.service"

const UNSUPPORTED_DOMAIN_REASON = "Email backend does not support this domain"

function isNestedSubdomain(domainName: string, allNames: string[]) {
  return allNames.some(
    (candidate) =>
      candidate !== domainName && domainName.endsWith(`.${candidate}`)
  )
}

function serializeBackendSystemDomains(domainNames: string[]) {
  const addedAt = new Date().toISOString()

  return domainNames
    .filter((domainName) => !isNestedSubdomain(domainName, domainNames))
    .map((domainName) => ({
      id: `system_${domainName}`,
      name: domainName,
      type: "system",
      source: "system",
      addedAt,
      isVerified: true,
      visibility: "public",
      privateUntil: null,
      isBanned: false,
      isOwnedByUser: false,
    }))
}

// GET /api/domains — semua domain dibaca dari MongoDB.
// Kalau belum ada system domain di DB, import sekali dari backend email API.
export async function GET() {
  try {
    const auth = await getAuthUser()
    const isAdminSession = await isAdminRequest()

    if (!hasMongoConfig()) {
      let backendDomains: string[]

      try {
        backendDomains = await fetchEmailApiSystemDomains()
      } catch (error) {
        console.warn("[domains:get] Email API domains unavailable", error)

        return NextResponse.json(
          {
            error: "Domain backend tidak merespons.",
          },
          { status: 503 }
        )
      }

      if (backendDomains.length === 0) {
        return NextResponse.json(
          {
            error:
              "Domain backend tidak tersedia. Konfigurasi EMAIL_API_URL, NEXT_PUBLIC_EMAIL_API_URL, atau NEXT_PUBLIC_API_URL.",
          },
          { status: 503 }
        )
      }

      return NextResponse.json(serializeBackendSystemDomains(backendDomains))
    }

    await connectDB()

    const systemCount = await DomainModel.countDocuments({ type: "system" })
    if (systemCount === 0) {
      try {
        await syncSystemDomainsFromEmailApi()
      } catch (error) {
        console.warn("[domains:get] failed to sync system domains", error)
      }
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

    const visibleDomains = domains.filter((domain) => {
      const privateOwnerId = privateDomainOwners.get(domain.name)

      if (privateOwnerId !== undefined) {
        if (
          isAdminSession &&
          resolveDomainSource(domain) === "system" &&
          domain.visibility === "private"
        ) {
          return true
        }

        return Boolean(authUserId && domain.userId?.toString() === authUserId)
      }

      return canSeeDomain(domain, authUserId, new Date(), {
        isAdminSession,
      })
    })
    const support = await filterSupportedEmailApiDomains(
      visibleDomains.map((domain) => domain.name)
    )
    const supportedOrUnknownNames = new Set([
      ...support.supported,
      ...support.unknown,
    ])

    if (support.unsupported.length > 0) {
      await DomainModel.updateMany(
        { name: { $in: support.unsupported } },
        {
          $set: {
            isVerified: false,
            isBanned: true,
            banReason: UNSUPPORTED_DOMAIN_REASON,
          },
        }
      )
    }

    const supportedVisibleDomains = uniqueDomainsByName(
      visibleDomains.filter((domain) =>
        supportedOrUnknownNames.has(normalizeDomain(domain.name))
      )
    )
    const visibleDomainNames = supportedVisibleDomains.map(
      (domain) => domain.name
    )

    return NextResponse.json(
      supportedVisibleDomains
        .filter((domain) => !isNestedSubdomain(domain.name, visibleDomainNames))
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

  try {
    const status = await getBackendDomainStatus(normalized)
    if (!isSupportedBackendDomainStatus(status)) {
      return NextResponse.json(
        { error: "Domain tidak support untuk menerima email" },
        { status: 400 }
      )
    }
  } catch (error) {
    console.warn("[domains:post] failed to verify backend support", error)
    return NextResponse.json(
      { error: "Gagal memverifikasi support domain di backend email" },
      { status: 503 }
    )
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
