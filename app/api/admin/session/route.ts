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

function isSecureRequest(req: Request) {
  const forwardedProto = req.headers.get("x-forwarded-proto")
  if (forwardedProto) {
    return forwardedProto
      .split(",")
      .some((value) => value.trim().toLowerCase() === "https")
  }

  return new URL(req.url).protocol === "https:"
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
  const secure = isSecureRequest(req)

  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: getAdminSessionMaxAge(),
  })

  return response
}

export async function DELETE(req: Request) {
  const response = NextResponse.json({ authenticated: false })
  const secure = isSecureRequest(req)

  response.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  })

  return response
}
