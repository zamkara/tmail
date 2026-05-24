import { NextResponse } from "next/server"

import { buildBackendUrl, getBackendBaseUrl } from "@/services/backend.service"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
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

  const body = (await req.json().catch(() => null)) as {
    messageId?: unknown
  } | null
  const messageId =
    typeof body?.messageId === "string" ? body.messageId.trim() : ""

  if (!messageId) {
    return NextResponse.json({ error: "Message ID is required" }, { status: 400 })
  }

  const target = buildBackendUrl(`/messages/${encodeURIComponent(messageId)}`)
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
    return NextResponse.json(data ?? { error: "Failed to delete message" }, {
      status: res.status,
    })
  }

  return NextResponse.json(data)
}
