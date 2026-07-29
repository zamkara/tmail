import { NextResponse } from "next/server"

import { buildBackendUrl, getBackendBaseUrl } from "@/services/backend.service"

export const dynamic = "force-dynamic"

export async function POST() {
  const token = process.env.BACKEND_ADMIN_TOKEN ?? process.env.ADMIN_TOKEN ?? ""
  const baseUrl = getBackendBaseUrl()

  if (!baseUrl || !token) {
    return NextResponse.json(
      {
        error:
          "Backend admin token is not configured. Set BACKEND_ADMIN_TOKEN or ADMIN_TOKEN.",
      },
      { status: 503 }
    )
  }

  const target = buildBackendUrl("/admin/messages")
  if (!target) {
    return NextResponse.json(
      { error: "Invalid backend API URL" },
      { status: 503 }
    )
  }

  const res = await fetch(target, {
    method: "DELETE",
    headers: {
      "X-Admin-Token": token,
    },
  })
  const data = await res.json().catch(() => null)

  if (!res.ok) {
    return NextResponse.json(
      data ?? { error: "Failed to delete all messages" },
      {
        status: res.status,
      }
    )
  }

  return NextResponse.json(data ?? { ok: true })
}
