import { NextResponse, type NextRequest } from "next/server"
import { verifyToken } from "@/lib/jwt"
import { getRequestPublicUrl } from "@/lib/request-origin"

// Halaman yang hanya bisa diakses kalau SUDAH login
const AUTH_ONLY_PATHS = ["/account", "/inbox"]
// Halaman yang hanya bisa diakses kalau BELUM login
const GUEST_ONLY_PATHS = ["/signin", "/signup", "/login"]

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get("tmail_token")?.value

  const isAuthOnly = AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p))
  const isGuestOnly = GUEST_ONLY_PATHS.some((p) => pathname.startsWith(p))

  let isAuthenticated = false
  if (token) {
    try {
      await verifyToken(token)
      isAuthenticated = true
    } catch {
      // token invalid, anggap guest
    }
  }

  if (isAuthOnly && !isAuthenticated) {
    return NextResponse.redirect(getRequestPublicUrl(req, "/signin"))
  }

  if (isGuestOnly && isAuthenticated) {
    return NextResponse.redirect(getRequestPublicUrl(req, "/inbox"))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
