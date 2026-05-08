import { resolveMx } from "node:dns/promises"
import { NextResponse } from "next/server"

import { getAuthUser } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import {
  getMxVerificationError,
  isValidDomain,
  MAIL_SERVER_HOST,
  normalizeDnsHost,
  normalizeDomain,
} from "@/lib/domain-validation"
import { Domain } from "@/models/domain.model"

const EMAIL_API = process.env.NEXT_PUBLIC_EMAIL_API_URL

// GET /api/domains — domain sistem dari BE email, custom domain dari MongoDB (butuh auth)
export async function GET() {
  const auth = await getAuthUser()

  const beRes = await fetch(`${EMAIL_API}/domains`)
  const beData = (await beRes.json()) as { domains: Array<{ domain: string }> }

  const systemDomains = beData.domains.map((d, i) => ({
    id: `sys_${i}_${d.domain}`,
    name: d.domain,
    type: "system" as const,
    isVerified: true,
    addedAt: new Date(0).toISOString(),
  }))

  if (!auth) return NextResponse.json(systemDomains)

  await connectDB()
  const customDomains = await Domain.find({ userId: auth.userId }).lean()

  return NextResponse.json([
    ...systemDomains,
    ...customDomains.map((d) => ({
      id: d._id.toString(),
      name: d.name,
      type: d.type,
      isVerified: d.isVerified,
      addedAt: d.createdAt,
    })),
  ])
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

  const existing = await Domain.findOne({ name: normalized })
  if (existing) {
    return NextResponse.json(
      { error: "Domain sudah terdaftar" },
      { status: 409 }
    )
  }

  const domain = await Domain.create({
    name: normalized,
    type: "custom",
    isVerified: true,
    userId: auth.userId,
  })

  return NextResponse.json({
    id: domain._id.toString(),
    name: domain.name,
    type: domain.type,
    isVerified: domain.isVerified,
    addedAt: domain.createdAt,
  })
}
