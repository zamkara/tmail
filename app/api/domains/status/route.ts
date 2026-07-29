import { NextResponse } from "next/server"

import { isAdminRequest } from "@/lib/admin-session"
import { connectDB, hasMongoConfig } from "@/lib/db"
import { normalizeDomain } from "@/lib/domain-validation"
import { resolveDomainSource } from "@/lib/domain-source"
import { Domain } from "@/models/domain.model"
import { buildBackendUrl } from "@/services/backend.service"

export const dynamic = "force-dynamic"

function getDomainCandidates(domain: string) {
  const normalized = normalizeDomain(domain)
  if (!normalized) return []

  const labels = normalized.split(".").filter(Boolean)
  const candidates: string[] = []

  for (let index = 0; index <= labels.length - 2; index += 1) {
    candidates.push(labels.slice(index).join("."))
  }

  return candidates
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const domain = searchParams.get("domain")?.trim().toLowerCase()

  if (!domain) {
    return NextResponse.json({ error: "domain wajib diisi" }, { status: 400 })
  }

  const target = buildBackendUrl("/domains/status")
  if (!target) {
    return NextResponse.json(
      { error: "Email API tidak dikonfigurasi" },
      { status: 503 }
    )
  }

  target.searchParams.set("domain", domain)

  const res = await fetch(target, { cache: "no-store" })
  const data = (await res.json().catch(() => null)) as
    | Record<string, unknown>
    | null

  if (data && hasMongoConfig()) {
    try {
      const isAdminSession = await isAdminRequest()
      await connectDB()

      const appDomain = await Domain.findOne({
        name: { $in: getDomainCandidates(domain) },
      })
        .sort({ name: -1 })
        .lean()

      if (appDomain) {
        const source = resolveDomainSource(appDomain)
        const visibility = appDomain.visibility ?? "public"

        data.registered = true
        data.visibility = visibility
        data.built_in = source === "system"
        data.app_domain = appDomain.name
        data.app_source = source
        data.admin_access = Boolean(
          isAdminSession && source === "system" && visibility === "private"
        )

        if (visibility === "private" && !data.admin_access) {
          data.status_label = "Domain registered for private use only"
        }
      }
    } catch (error) {
      console.warn("[domains:status] failed to merge app domain status", error)
    }
  }

  return NextResponse.json(data ?? { error: "Failed to load domain status" }, {
    status: res.status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  })
}
