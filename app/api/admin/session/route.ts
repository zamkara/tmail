import { createHash, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import {
  ADMIN_COOKIE,
  getAdminSessionMaxAge,
  signAdminSession,
  verifyAdminSession,
} from "@/lib/admin-session"

export const dynamic = "force-dynamic"

function hash(value: string) {
  return createHash("sha256").update(value).digest()
}

function isValidPassword(value: unknown) {
  const configuredPassword = process.env.ADMIN_AUTH
  if (!configuredPassword || typeof value !== "string") return false

  return timingSafeEqual(hash(value), hash(configuredPassword))
}

export async function GET() {
  const cookieStore = await cookies()
  const isAuthenticated = await verifyAdminSession(
    cookieStore.get(ADMIN_COOKIE)?.value
  )

  return NextResponse.json({ authenticated: isAuthenticated })
}

export async function POST(req: Request) {
  if (!process.env.ADMIN_AUTH) {
    return NextResponse.json(
      { error: "Admin password is not configured" },
      { status: 503 }
    )
  }

  const body = (await req.json().catch(() => null)) as {
    password?: unknown
  } | null

  if (!isValidPassword(body?.password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 })
  }

  const token = await signAdminSession()
  const response = NextResponse.json({ authenticated: true })

  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getAdminSessionMaxAge(),
  })

  return response
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false })

  response.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })

  return response
}
