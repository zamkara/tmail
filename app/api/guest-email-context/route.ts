import { NextResponse } from "next/server"

import {
  GUEST_EMAIL_COOKIE,
  GUEST_EMAIL_COOKIE_MAX_AGE,
  normalizeGuestEmail,
} from "@/lib/guest-email"
import { getRequestPublicUrl } from "@/lib/request-origin"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const requestedEmail = searchParams.get("email") ?? ""
  const normalizedEmail = normalizeGuestEmail(requestedEmail)
  const email = normalizedEmail ?? requestedEmail.trim().toLowerCase()

  const response = NextResponse.redirect(getRequestPublicUrl(req, "/"))
  response.cookies.set(GUEST_EMAIL_COOKIE, email, {
    path: "/",
    maxAge: GUEST_EMAIL_COOKIE_MAX_AGE,
    sameSite: "lax",
  })

  return response
}
