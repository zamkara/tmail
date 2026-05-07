import { cookies } from "next/headers"
import { verifyToken } from "./jwt"

export const AUTH_COOKIE = "tmail_token"

export async function getAuthUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE)?.value
  if (!token) return null

  try {
    return await verifyToken(token)
  } catch {
    return null
  }
}
