import type { EmailItem, GeneratedAddress } from "@/types"

export type InboxFolder = "inbox" | "junk" | "trash"

export function resolveActiveAddress(
  addresses: GeneratedAddress[],
  params: { slug?: string[] },
  activeAddressId: string | null
) {
  const slug = params.slug
  if (slug && slug.length >= 2) {
    const [username, domain] = slug
    const addressById = addresses.find((address) => address.id === username)
    if (addressById) return addressById

    return (
      addresses.find(
        (address) =>
          address.username === username && address.domainName === domain
      ) ?? null
    )
  }
  if (slug?.length === 1) {
    return (
      addresses.find((address) => address.id === slug[0]) ??
      addresses.find((address) => address.id === activeAddressId) ??
      null
    )
  }
  return addresses.find((address) => address.id === activeAddressId) ?? null
}

function usesLegacyInboxSlug(
  slug: string[] | undefined,
  address: GeneratedAddress | null
) {
  if (!slug || !address) return false
  if (slug[0] === address.id) return false

  return slug.length >= 2 && address.username === slug[0] && address.domainName === slug[1]
}

export function getMailIdFromSlug(
  slug: string[] | undefined,
  address: GeneratedAddress | null
) {
  if (!slug || !address) return null

  const baseLength = usesLegacyInboxSlug(slug, address) ? 2 : 1
  const mailId = slug[baseLength]
  if (!mailId || mailId === "junk" || mailId === "trash") return null

  return mailId
}

export function buildInboxHref(address: GeneratedAddress) {
  return `/inbox/${address.id}`
}

export function buildInboxFolderHref(
  address: GeneratedAddress,
  folder: InboxFolder
) {
  const base = buildInboxHref(address)
  return folder === "inbox" ? base : `/inbox/${folder}/${base.replace("/inbox/", "")}`
}

export function getInboxFolderFromPathname(pathname: string): InboxFolder {
  const segments = pathname.split("/").filter(Boolean)
  const folder = segments[1]

  if (folder === "junk" || folder === "trash") return folder
  return "inbox"
}

export function parseInboxSender(from: string) {
  const match = from.match(/^"?(.+?)"?\s*<(.+?)>$/)
  if (match) return { name: match[1].trim(), email: match[2].trim() }
  return { name: null, email: from.trim() }
}

export function mapInboxMessage(
  message: {
    id: string
    from: string
    subject: string
    timestamp: number
    text?: string
    otp?: string | null
  },
  address: GeneratedAddress,
  isRead: boolean
): EmailItem {
  return {
    id: message.id,
    addressId: buildInboxHref(address),
    from: parseInboxSender(message.from),
    subject: message.subject || "(no subject)",
    receivedAt: new Date(message.timestamp).toISOString(),
    isRead,
    snippet: message.text ?? "",
    otp: message.otp ?? null,
  }
}

export function formatRelativeInboxTime(value: string) {
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return "Yesterday"
  return `${days}d ago`
}
