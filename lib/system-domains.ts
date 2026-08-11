import { Domain } from "@/models/domain.model"
import { buildBackendUrl } from "@/services/backend.service"

const DOMAIN_FETCH_TIMEOUT_MS = 4000

interface EmailApiDomainResponse {
  domains?: Array<{ domain?: string }>
}

function normalizeDomain(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

export async function fetchEmailApiSystemDomains() {
  const target = buildBackendUrl("/random-domain")
  if (!target) return []

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DOMAIN_FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(target, {
      cache: "no-store",
      signal: controller.signal,
    })

    if (!res.ok) {
      throw new Error(`Email API returned status ${res.status}`)
    }

    const data = (await res.json()) as EmailApiDomainResponse
    return [
      ...new Set(
        (data.domains ?? [])
          .map((item) => normalizeDomain(item.domain))
          .filter(Boolean)
      ),
    ]
  } finally {
    clearTimeout(timeout)
  }
}

export async function syncSystemDomainsFromEmailApi() {
  const domains = await fetchEmailApiSystemDomains()
  if (domains.length === 0) return []

  await Promise.all(
    domains.map((name) =>
      Domain.updateOne(
        { name, userId: null },
        {
          $set: {
            type: "system",
            source: "system",
            isVerified: true,
          },
          $setOnInsert: {
            name,
            userId: null,
          },
        },
        { upsert: true }
      )
    )
  )

  return domains
}
