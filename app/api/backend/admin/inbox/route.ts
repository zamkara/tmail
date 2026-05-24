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
    email?: unknown
  } | null
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }

  const target = buildBackendUrl(`/inbox?email=${encodeURIComponent(email)}`)
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
    return NextResponse.json(data ?? { error: "Failed to delete inbox" }, {
      status: res.status,
    })
  }

  return NextResponse.json(data)
}
