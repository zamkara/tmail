import { getDomain } from "tldts"

import { normalizeDomain } from "@/lib/domain-validation"
import { resolveDomainSource } from "@/lib/domain-source"
import type { DomainSource } from "@/types"

type DomainListItem = {
  name: string
  source?: DomainSource | null
  type?: "system" | "custom" | null
  userId?: { toString(): string } | string | null
  isOwnedByUser?: boolean | null
}

function getDomainPriority(domain: DomainListItem) {
  if (domain.isOwnedByUser) return 0

  const source = resolveDomainSource(domain)
  if (source === "system") return 1
  if (source === "user") return 2

  return 3
}

export function uniqueDomainsByName<T extends DomainListItem>(domains: T[]) {
  const uniqueDomains = new Map<string, T>()

  for (const domain of domains) {
    const name = normalizeDomain(domain.name)
    if (!name) continue

    const current = uniqueDomains.get(name)
    if (!current || getDomainPriority(domain) < getDomainPriority(current)) {
      uniqueDomains.set(name, domain)
    }
  }

  return Array.from(uniqueDomains.values())
}

function getRegistrableDomain(domainName: string) {
  return getDomain(normalizeDomain(domainName)) ?? ""
}

/** Keep only registrable/root domains, including when the root is not returned. */
export function rootDomainsOnly<T extends DomainListItem>(domains: T[]) {
  return domains.filter(
    (domain) => normalizeDomain(domain.name) === getRegistrableDomain(domain.name)
  )
}
