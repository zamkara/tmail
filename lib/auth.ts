import { cookies } from "next/headers"
import { verifyToken } from "./jwt"

export const AUTH_COOKIE = "tmail_token"

type SerializableUser = {
  _id: { toString(): string }
  name: string
  email: string
  avatarPreset?: string | null
  isPremium?: boolean | null
  premiumUntil?: Date | string | null
  premiumPrivateDomainLimit?: number | null
  apiKeyPrefix?: string | null
  apiKeyAllowAllIps?: boolean | null
  apiKeyAllowedIps?: string[] | null
  apiKeyBlockedIps?: string[] | null
}

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

export function isPremiumActive(
  user: Pick<SerializableUser, "isPremium" | "premiumUntil">,
  now = new Date()
) {
  return Boolean(
    user.isPremium &&
      user.premiumUntil &&
      new Date(user.premiumUntil).getTime() > now.getTime()
  )
}

export function getPremiumPrivateDomainLimit(
  user: Pick<SerializableUser, "isPremium" | "premiumUntil" | "premiumPrivateDomainLimit">,
  now = new Date()
) {
  if (!isPremiumActive(user, now)) return 0

  return Math.max(1, user.premiumPrivateDomainLimit ?? 0)
}

export function serializeAuthUser(user: SerializableUser) {
  const premiumUntil = user.premiumUntil
    ? new Date(user.premiumUntil).toISOString()
    : null
  const isPremium = isPremiumActive(user)

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatarPreset: user.avatarPreset ?? null,
    isPremium,
    premiumUntil: isPremium ? premiumUntil : null,
    premiumPrivateDomainLimit: getPremiumPrivateDomainLimit(user),
    apiKeyPrefix: user.apiKeyPrefix ?? null,
    apiKeyAllowAllIps: user.apiKeyAllowAllIps ?? true,
    apiKeyAllowedIps: user.apiKeyAllowedIps ?? [],
    apiKeyBlockedIps: user.apiKeyBlockedIps ?? [],
  }
}
