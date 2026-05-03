import { mockDomains } from "@/mock/domains"
import type { Domain } from "@/types"

const domainPattern =
  /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/

export async function getDomains(): Promise<Domain[]> {
  return Promise.resolve(mockDomains)
}

export async function addDomain(name: string): Promise<Domain> {
  const normalizedName = name.trim().toLowerCase()

  if (!domainPattern.test(normalizedName)) {
    throw new Error("Format domain tidak valid")
  }

  return Promise.resolve({
    id: `dom_custom_${Date.now()}`,
    name: normalizedName,
    type: "custom",
    addedAt: new Date().toISOString(),
    isVerified: false,
  })
}
