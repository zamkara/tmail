import { isAdminRequest } from "@/lib/admin-session"
import { getAuthUser } from "@/lib/auth"
import { connectDB, hasMongoConfig } from "@/lib/db"
import { canUseDomain } from "@/lib/domain-access"
import { normalizeDomain } from "@/lib/domain-validation"
import { Domain } from "@/models/domain.model"

function getDomainLookupCandidates(domain: string) {
  const normalizedDomain = normalizeDomain(domain)
  if (!normalizedDomain) return []

  const labels = normalizedDomain.split(".").filter(Boolean)
  const candidates: string[] = []

  for (let index = 0; index <= labels.length - 2; index += 1) {
    candidates.push(labels.slice(index).join("."))
  }

  return candidates
}

export async function canGuestAccessInboxAddress(address: string) {
  const domainPart = address.split("@")[1]?.trim()
  const normalizedDomain = normalizeDomain(domainPart)

  if (!normalizedDomain || !hasMongoConfig()) {
    return true
  }

  const auth = await getAuthUser()
  const isAdminSession = await isAdminRequest()

  await connectDB()

  const candidates = getDomainLookupCandidates(normalizedDomain)
  if (candidates.length === 0) {
    return true
  }

  const matchingDomains = await Domain.find({
    name: { $in: candidates },
  }).lean()

  const matchedDomain =
    matchingDomains.find(
      (domain) => normalizeDomain(domain.name) === normalizedDomain
    ) ??
    [...matchingDomains].sort(
      (first, second) => second.name.length - first.name.length
    )[0] ??
    null

  if (!matchedDomain) {
    return true
  }

  return canUseDomain(matchedDomain, auth?.userId ?? null, new Date(), {
    isAdminSession,
  })
}
