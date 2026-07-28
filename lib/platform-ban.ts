import { getAdminSettings } from "@/lib/admin-settings"

function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/\.+$/, "")
}

export function extractSenderEmailAddress(from: string) {
  const match = from.match(/<([^>]+)>/)
  const value = (match?.[1] ?? from).trim().toLowerCase()
  return value.includes("@") ? value : null
}

export function extractSenderDomain(from: string) {
  const email = extractSenderEmailAddress(from)
  if (!email) return null

  const domain = email.split("@")[1]?.trim()
  return domain ? normalizeDomain(domain) : null
}

export function isSenderDomainBlocked(
  from: string,
  blockedSenderDomains: string[]
) {
  const senderDomain = extractSenderDomain(from)
  if (!senderDomain) return false

  return blockedSenderDomains.some((blockedDomain) => {
    const normalizedBlocked = normalizeDomain(blockedDomain)
    return (
      senderDomain === normalizedBlocked ||
      senderDomain.endsWith(`.${normalizedBlocked}`)
    )
  })
}

export async function filterBlockedInboxMessages<
  T extends { from?: string | null }
>(messages: T[]) {
  const settings = await getAdminSettings()
  const blockedSenderDomains = settings.blockedSenderDomains ?? []

  if (blockedSenderDomains.length === 0) {
    return messages
  }

  return messages.filter(
    (message) =>
      !message.from ||
      !isSenderDomainBlocked(message.from, blockedSenderDomains)
  )
}

export async function isBlockedInboxMessage(from: string | null | undefined) {
  if (!from) return false

  const settings = await getAdminSettings()
  return isSenderDomainBlocked(from, settings.blockedSenderDomains ?? [])
}
