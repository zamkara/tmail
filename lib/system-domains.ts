import { Domain } from "@/models/domain.model"
import { rootDomainsOnly } from "@/lib/domain-list"
import { isSupportedBackendDomainStatus } from "@/lib/domain-support"
import {
  buildBackendUrl,
  type BackendDomainStatus,
} from "@/services/backend.service"

const DOMAIN_FETCH_TIMEOUT_MS = 4000
const DOMAIN_STATUS_TIMEOUT_MS = 4000
const UNSUPPORTED_DOMAIN_REASON = "Email backend does not support this domain"

interface EmailApiDomainResponse {
  domains?: Array<{ domain?: string }>
}

function normalizeDomain(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

function uniqueDomainNames(values: string[]) {
  return [...new Set(values.map(normalizeDomain).filter(Boolean))]
}

async function fetchJsonWithTimeout<T>(target: URL, timeoutMs: number) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(target, {
      cache: "no-store",
      signal: controller.signal,
    })

    if (!res.ok) {
      throw new Error(`Email API returned status ${res.status}`)
    }

    return (await res.json()) as T
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchEmailApiSystemDomainCandidates() {
  const target = buildBackendUrl("/random-domain")
  if (!target) return []

  const data = await fetchJsonWithTimeout<EmailApiDomainResponse>(
    target,
    DOMAIN_FETCH_TIMEOUT_MS
  )

  return rootDomainsOnly(
    uniqueDomainNames(
      (data.domains ?? []).map((item) => normalizeDomain(item.domain))
    ).map((name) => ({ name }))
  ).map((domain) => domain.name)
}

async function fetchEmailApiDomainStatus(name: string) {
  const target = buildBackendUrl("/domains/status")
  if (!target) throw new Error("Email API tidak dikonfigurasi")

  target.searchParams.set("domain", name)

  return fetchJsonWithTimeout<BackendDomainStatus>(
    target,
    DOMAIN_STATUS_TIMEOUT_MS
  )
}

export async function filterSupportedEmailApiDomains(domainNames: string[]) {
  const results = await Promise.all(
    uniqueDomainNames(domainNames).map(async (name) => {
      try {
        const status = await fetchEmailApiDomainStatus(name)

        return {
          name,
          supported: isSupportedBackendDomainStatus(status),
          checked: true,
        }
      } catch (error) {
        console.warn(
          `[domains:sync] failed to check backend status for ${name}`,
          error
        )

        return {
          name,
          supported: false,
          checked: false,
        }
      }
    })
  )

  return {
    supported: results
      .filter((result) => result.checked && result.supported)
      .map((result) => result.name),
    unsupported: results
      .filter((result) => result.checked && !result.supported)
      .map((result) => result.name),
    unknown: results
      .filter((result) => !result.checked)
      .map((result) => result.name),
  }
}

export async function fetchEmailApiSystemDomains() {
  const candidates = await fetchEmailApiSystemDomainCandidates()
  const { supported } = await filterSupportedEmailApiDomains(candidates)

  return supported
}

async function markUnsupportedSystemDomains(domainNames: string[]) {
  const names = uniqueDomainNames(domainNames)
  if (names.length === 0) return

  await Domain.updateMany(
    {
      name: { $in: names },
      type: "system",
      userId: null,
    },
    {
      $set: {
        isVerified: false,
        isBanned: true,
        banReason: UNSUPPORTED_DOMAIN_REASON,
      },
    }
  )
}

async function markUnsupportedExistingSystemDomains() {
  const existingDomains = await Domain.find({
    type: "system",
    userId: null,
    isBanned: { $ne: true },
  })
    .select("name")
    .lean()

  const { unsupported } = await filterSupportedEmailApiDomains(
    existingDomains.map((domain) => domain.name)
  )

  await markUnsupportedSystemDomains(unsupported)
}

export async function syncSystemDomainsFromEmailApi() {
  const candidates = await fetchEmailApiSystemDomainCandidates()
  const { supported, unsupported } =
    await filterSupportedEmailApiDomains(candidates)
  const domains = supported

  await markUnsupportedSystemDomains(unsupported)
  await markUnsupportedExistingSystemDomains()

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
            isBanned: false,
            banReason: null,
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
