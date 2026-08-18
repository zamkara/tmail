import { NextResponse } from "next/server"

import { canGuestAccessInboxAddress } from "@/lib/guest-domain-access"
import { isBlockedInboxMessage } from "@/lib/platform-ban"
import { buildBackendUrl, getBackendBaseUrl } from "@/services/backend.service"

const BASE = getBackendBaseUrl()
export const dynamic = "force-dynamic"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ mailId: string }> }
) {
  const { mailId } = await params
  const address = new URL(req.url).searchParams.get("address")

  if (address && !(await canGuestAccessInboxAddress(address))) {
    return NextResponse.json(
      { error: "Domain registered for private use only" },
      { status: 403 }
    )
  }

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
