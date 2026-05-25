import { NextResponse } from "next/server"

import { buildBackendUrl } from "@/services/backend.service"

const BASE = process.env.NEXT_PUBLIC_EMAIL_API_URL?.trim() ?? ""
const INBOX_TIMEOUT_MS = Number(process.env.EMAIL_API_TIMEOUT_MS ?? 5000)
export const dynamic = "force-dynamic"

async function fetchWithTimeout(input: URL, init: RequestInit = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), INBOX_TIMEOUT_MS)

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const address = searchParams.get("address")

  if (!address)
    return NextResponse.json({ error: "address wajib diisi" }, { status: 400 })

  if (!BASE) {
    return NextResponse.json(
      { messages: [] },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    )
  }

  const target = buildBackendUrl("/inbox")
  if (!target) {
    return NextResponse.json(
      { messages: [] },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    )
  }

  target.searchParams.set("email", address)

  try {
    const res = await fetchWithTimeout(target, {
      cache: "no-store",
    })
    const data = await res.json().catch(() => null)

    return NextResponse.json(data ?? { messages: [] }, {
      status: res.ok ? 200 : res.status,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    })
  } catch (error) {
    console.warn(
      "[inbox:get] Email API request failed",
      error instanceof Error ? error.message : error
    )

    return NextResponse.json(
      {
        messages: [],
        backend_unavailable: true,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    )
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const address = searchParams.get("address")
  const token = process.env.BACKEND_ADMIN_TOKEN ?? process.env.ADMIN_TOKEN ?? ""

  if (!address)
    return NextResponse.json({ error: "address wajib diisi" }, { status: 400 })

  if (!BASE) {
    return NextResponse.json(
      { error: "Email API tidak dikonfigurasi" },
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

  const target = buildBackendUrl("/inbox")
  if (!target) {
    return NextResponse.json(
      { error: "Email API tidak dikonfigurasi" },
      { status: 503 }
    )
  }

  target.searchParams.set("email", address)

  try {
    const res = await fetchWithTimeout(target, {
      method: "DELETE",
      cache: "no-store",
      headers: {
        accept: "*/*",
        "X-Admin-Token": token,
      },
    })
    const data = await res.json().catch(() => null)

    return NextResponse.json(data ?? { error: "Failed to delete messages" }, {
      status: res.status,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    })
  } catch (error) {
    console.warn(
      "[inbox:delete] Email API request failed",
      error instanceof Error ? error.message : error
    )

    return NextResponse.json(
      {
        error: "Email API tidak merespons",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    )
  }
}
