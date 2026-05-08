import { NextResponse } from "next/server"

const BASE = process.env.NEXT_PUBLIC_EMAIL_API_URL
export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ mailId: string }> }
) {
  const { mailId } = await params
  const res = await fetch(`${BASE}/messages/${mailId}`, { cache: "no-store" })
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
