import { NextResponse } from "next/server"

import { buildBackendUrl } from "@/services/backend.service"

export const dynamic = "force-dynamic"

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
  const data = await res.json().catch(() => null)

  return NextResponse.json(data ?? { error: "Failed to load domain status" }, {
    status: res.status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  })
}
