import { NextResponse } from "next/server"

import { buildBackendUrl } from "@/services/backend.service"

const ALLOWED_PATHS = new Set(["/health", "/swagger.json", "/random-domain"])

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const path = searchParams.get("path") ?? ""

  if (!ALLOWED_PATHS.has(path)) {
    return NextResponse.json({ error: "Unsupported backend path" }, { status: 400 })
  }

  const target = buildBackendUrl(path)
  if (!target) {
    return NextResponse.json(
      { error: "EMAIL_API_URL tidak dikonfigurasi" },
      { status: 503 }
    )
  }

  for (const [key, value] of searchParams.entries()) {
    if (key !== "path") target.searchParams.set(key, value)
  }

  const res = await fetch(target, { cache: "no-store" })
  const data = await res.json().catch(() => null)

  return NextResponse.json(data ?? { error: "Empty backend response" }, {
    status: res.status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  })
}
