import type { EmailDetail, EmailItem } from "@/types"

const BASE = process.env.NEXT_PUBLIC_EMAIL_API_URL?.trim() ?? ""

interface BeInboxItem {
  id: string
  from: string       // "Name <email>" atau "email"
  subject: string
  timestamp: number  // unix ms
}

interface BeMessage extends BeInboxItem {
  to: string[]
  text: string
  html: string | false
  raw: string
  created_at: number
}

function parseFrom(from: string): { name: string | null; email: string } {
  const match = from.match(/^(.+?)\s*<(.+?)>$/)
  if (match) return { name: match[1].trim(), email: match[2].trim() }
  return { name: null, email: from.trim() }
}

function mapInboxItem(msg: BeInboxItem, addressId: string): EmailItem {
  return {
    id: msg.id,
    addressId,
    from: parseFrom(msg.from),
    subject: msg.subject || "(no subject)",
    receivedAt: new Date(msg.timestamp).toISOString(),
    isRead: false,
    snippet: "",
  }
}

function buildEmailApiUrl(path: string) {
  if (!BASE) return null

  try {
    return new URL(path, BASE)
  } catch {
    return null
  }
}

export async function getEmails(addressId: string, address: string): Promise<EmailItem[]> {
  const url = buildEmailApiUrl(`/inbox?email=${encodeURIComponent(address)}`)
  if (!url) return []

  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json() as { messages: BeInboxItem[] }
  return (data.messages ?? []).map((m) => mapInboxItem(m, addressId))
}

export async function getEmailDetail(
  addressId: string,
  mailId: string
): Promise<EmailDetail> {
  const url = buildEmailApiUrl(`/messages/${mailId}`)
  if (!url) throw new Error("Email API tidak dikonfigurasi")

  const res = await fetch(url)
  if (!res.ok) throw new Error("Email not found")
  const msg = await res.json() as BeMessage

  return {
    ...mapInboxItem(msg, addressId),
    receivedAt: new Date(msg.created_at).toISOString(),
    bodyHtml: msg.html || null,
    bodyText: msg.text ?? "",
    headers: {},
  }
}
