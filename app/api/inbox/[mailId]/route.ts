import { NextResponse } from "next/server"

const BASE = process.env.NEXT_PUBLIC_EMAIL_API_URL?.trim() ?? ""
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

  let target: URL
  try {
    target = new URL(`/messages/${mailId}`, BASE)
  } catch {
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
  return NextResponse.json(await res.json(), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  })
}
