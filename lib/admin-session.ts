import { jwtVerify, SignJWT } from "jose"
import { cookies } from "next/headers"
import { authenticateAdminApiKey } from "@/lib/admin-api-key"

export const ADMIN_COOKIE = "tmail_admin_session"

const ADMIN_SESSION_EXPIRES_SECONDS = 8 * 60 * 60
const ADMIN_SESSION_EXPIRES_IN = "8h"

function getAdminSecret() {
  const secret = process.env.JWT_SECRET ?? process.env.ADMIN_AUTH
  if (!secret) throw new Error("JWT_SECRET or ADMIN_AUTH is required")

  return new TextEncoder().encode(secret)
}

export async function signAdminSession() {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ADMIN_SESSION_EXPIRES_IN)
    .sign(getAdminSecret())
}

export async function verifyAdminSession(token: string | undefined) {
  if (!token) return false

  try {
    const { payload } = await jwtVerify(token, getAdminSecret())
    return payload.role === "admin"
  } catch {
    return false
  }
}

export async function isAdminRequest(req?: Request) {
  if (req && (await authenticateAdminApiKey(req))) {
    return true
  }

  const cookieStore = await cookies()
  return verifyAdminSession(cookieStore.get(ADMIN_COOKIE)?.value)
}

export function getAdminSessionMaxAge() {
  return ADMIN_SESSION_EXPIRES_SECONDS
}
