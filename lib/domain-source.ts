import type { DomainSource } from "@/types"

type DomainLike = {
  source?: DomainSource | null
  type?: "system" | "custom" | null
  userId?: { toString(): string } | string | null
}

export function resolveDomainSource(domain: DomainLike): DomainSource {
  if (domain.source === "system" || domain.source === "user" || domain.source === "guest") {
    return domain.source
  }

  if (domain.type === "system") return "system"
  if (domain.userId) return "user"
  return "guest"
}

