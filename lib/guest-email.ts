import { isValidDomain, normalizeDomain } from "@/lib/domain-validation"

export const GUEST_EMAIL_COOKIE = "guest_email_ctx"
export const GUEST_EMAIL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30

export function normalizeGuestEmail(value: string) {
  const decoded = decodeURIComponent(value).trim().toLowerCase()
  const atIndex = decoded.lastIndexOf("@")
  if (atIndex <= 0) return null

  const localPart = decoded.slice(0, atIndex).trim()
  const domainPart = normalizeDomain(decoded.slice(atIndex + 1))

  if (!localPart || /\s/.test(localPart) || localPart.includes("@")) {
    return null
  }
  if (!domainPart || !isValidDomain(domainPart)) return null

  return `${localPart}@${domainPart}`
}
