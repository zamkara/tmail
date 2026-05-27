import { NextResponse } from "next/server"

import { buildBackendUrl, getBackendBaseUrl } from "@/services/backend.service"

export const dynamic = "force-dynamic"

export async function GET() {
  const token = process.env.BACKEND_ADMIN_TOKEN ?? process.env.ADMIN_TOKEN ?? ""
  const baseUrl = getBackendBaseUrl()

  if (!baseUrl) {
    return NextResponse.json(
      { error: "EMAIL_API_URL tidak dikonfigurasi" },
      { status: 503 }
    )
  }

  if (!token) {
    return NextResponse.json(
      {
        error:
          "Backend admin token is not configured. Set BACKEND_ADMIN_TOKEN or ADMIN_TOKEN.",
      },
      { status: 503 }
    )
  }

  const target = buildBackendUrl("/system/status")
  if (!target) {
    return NextResponse.json(
      { error: "Invalid backend API URL" },
      { status: 503 }
    )
  }

  const res = await fetch(target, {
    cache: "no-store",
    headers: {
      "X-Admin-Token": token,
    },
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    return NextResponse.json(data ?? { error: "Failed to load system status" }, {
      status: res.status,
    })
  }

  return NextResponse.json(data)
}
