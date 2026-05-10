import type { Types } from "mongoose"

type DomainAccessInput = {
  type: "system" | "custom"
  visibility?: "public" | "private" | null
  privateUntil?: Date | string | null
  isVerified?: boolean | null
  isBanned?: boolean | null
  userId?: Types.ObjectId | string | null
}

export function isPrivateActive(domain: DomainAccessInput, now = new Date()) {
  if (domain.visibility !== "private") return false
  if (!domain.privateUntil) return false

  return new Date(domain.privateUntil).getTime() > now.getTime()
}

export function hasPrivateAccessWindow(
  domain: DomainAccessInput,
  now = new Date()
) {
  if (!domain.privateUntil) return false

  return new Date(domain.privateUntil).getTime() > now.getTime()
}

export function isDomainSuspended(domain: DomainAccessInput, now = new Date()) {
  return domain.visibility === "private" && !isPrivateActive(domain, now)
}

export function canUseDomain(
  domain: DomainAccessInput,
  userId: string | null,
  now = new Date()
) {
  if (!domain.isVerified || domain.isBanned) return false
  if (domain.type === "system") return true
  if (domain.visibility !== "private") return true
  if (!isPrivateActive(domain, now)) return false

  return Boolean(userId && domain.userId?.toString() === userId)
}

export function canSeeDomain(
  domain: DomainAccessInput,
  userId: string | null,
  now = new Date()
) {
  if (!domain.isVerified || domain.isBanned) return false
  if (domain.type === "system") return true
  if (domain.visibility !== "private") return true

  return Boolean(userId && domain.userId?.toString() === userId)
}
