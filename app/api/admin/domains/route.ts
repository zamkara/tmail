import { NextResponse } from "next/server"

import { isAdminRequest } from "@/lib/admin-session"
import { connectDB } from "@/lib/db"
import { isSupportedBackendDomainStatus } from "@/lib/domain-support"
import { isValidDomain, normalizeDomain } from "@/lib/domain-validation"
import { resolveDomainSource } from "@/lib/domain-source"
import { Domain } from "@/models/domain.model"
import { getBackendDomainStatus } from "@/services/backend.service"

export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as {
    name?: unknown
    type?: unknown
    source?: unknown
    isVerified?: unknown
    visibility?: unknown
    privateUntil?: unknown
  } | null
  const name = normalizeDomain(body?.name)
  const source = body?.source === "system" ? "system" : "guest"
  const type = source === "system" ? "system" : "custom"

  if (!name || !isValidDomain(name)) {
    return NextResponse.json({ error: "Invalid domain" }, { status: 400 })
  }

  try {
    const status = await getBackendDomainStatus(name)
    if (!isSupportedBackendDomainStatus(status)) {
      return NextResponse.json(
        { error: "Domain tidak support untuk menerima email" },
        { status: 400 }
      )
    }
  } catch (error) {
    console.warn("[admin:domains:post] failed to verify backend support", error)
    return NextResponse.json(
      { error: "Gagal memverifikasi support domain di backend email" },
      { status: 503 }
    )
  }

  await connectDB()

  const domain = await Domain.create({
    name,
    type,
    source,
    isVerified: typeof body?.isVerified === "boolean" ? body.isVerified : true,
    visibility: "public",
    privateUntil: null,
    userId: null,
  })

  return NextResponse.json({
    id: domain._id.toString(),
    name: domain.name,
    type: domain.type,
    source: resolveDomainSource(domain),
    isVerified: domain.isVerified,
    visibility: domain.visibility,
    privateUntil: domain.privateUntil,
    isBanned: domain.isBanned ?? false,
    banReason: domain.banReason ?? "",
    owner: null,
    createdAt: domain.createdAt,
    updatedAt: domain.updatedAt,
  })
}
