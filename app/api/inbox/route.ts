import { NextResponse } from "next/server"

const BASE = process.env.NEXT_PUBLIC_EMAIL_API_URL?.trim() ?? ""
export const dynamic = "force-dynamic"

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

  let target: URL
  try {
    target = new URL("/inbox", BASE)
  } catch {
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

  const res = await fetch(
    target,
    {
      cache: "no-store",
    }
  )
  const data = await res.json()
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  })
}
