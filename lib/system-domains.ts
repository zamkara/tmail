import { Domain } from "@/models/domain.model"

const DOMAIN_FETCH_TIMEOUT_MS = 8000

interface EmailApiDomainResponse {
  domains?: Array<{ domain?: string }>
}

function normalizeDomain(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

export async function fetchEmailApiSystemDomains() {
  const emailApi = process.env.NEXT_PUBLIC_EMAIL_API_URL
  if (!emailApi) return []

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DOMAIN_FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(`${emailApi}/domains`, {
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
        { name, type: "system" },
        {
          $setOnInsert: {
            name,
            type: "system",
            source: "system",
            isVerified: true,
            userId: null,
          },
        },
        { upsert: true }
      )
    )
  )

  return domains
}
