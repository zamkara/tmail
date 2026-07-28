import { NextResponse } from "next/server"

import { isBlockedInboxMessage } from "@/lib/platform-ban"
import { buildBackendUrl } from "@/services/backend.service"

const BASE = process.env.EMAIL_API_URL?.trim() ?? ""
export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ mailId: string }> }
) {
  const { mailId } = await params
  if (!BASE) {
    return NextResponse.json(
      { error: "Email API tidak dikonfigurasi" },
      { status: 404 }
    )
  }

  const target = buildBackendUrl(`/messages/${mailId}`)
  if (!target) {
    return NextResponse.json(
      { error: "Email API tidak dikonfigurasi" },
      { status: 404 }
    )
  }
  const res = await fetch(target, { cache: "no-store" })
  if (!res.ok)
    return NextResponse.json(
      { error: "Email tidak ditemukan" },
      { status: 404 }
    )
  const data = (await res.json()) as { from?: string | null }
  if (await isBlockedInboxMessage(data.from)) {
    return NextResponse.json(
      { error: "Email diblokir oleh kebijakan platform" },
      { status: 404 }
    )
  }

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  })
}
