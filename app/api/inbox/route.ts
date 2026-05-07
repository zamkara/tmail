import { NextResponse } from "next/server"

const BASE = process.env.NEXT_PUBLIC_EMAIL_API_URL

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const address = searchParams.get("address")

  if (!address) return NextResponse.json({ error: "address wajib diisi" }, { status: 400 })

  const res = await fetch(`${BASE}/inbox?email=${encodeURIComponent(address)}`)
  const data = await res.json()
  return NextResponse.json(data)
}
