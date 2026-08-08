import { NextResponse } from "next/server"

import {
  GUEST_EMAIL_COOKIE,
  GUEST_EMAIL_COOKIE_MAX_AGE,
  normalizeGuestEmail,
} from "@/lib/guest-email"

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url)
  const requestedEmail = searchParams.get("email") ?? ""
  const normalizedEmail = normalizeGuestEmail(requestedEmail)
  const email = normalizedEmail ?? requestedEmail.trim().toLowerCase()

  const response = NextResponse.redirect(new URL("/", origin))
  response.cookies.set(GUEST_EMAIL_COOKIE, email, {
    path: "/",
    maxAge: GUEST_EMAIL_COOKIE_MAX_AGE,
    sameSite: "lax",
  })

  return response
}
