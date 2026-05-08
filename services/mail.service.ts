import type { EmailDetail, EmailItem } from "@/types"

const BASE = process.env.NEXT_PUBLIC_EMAIL_API_URL

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

export async function getEmails(addressId: string, address: string): Promise<EmailItem[]> {
  const res = await fetch(`${BASE}/inbox?email=${encodeURIComponent(address)}`)
  if (!res.ok) return []
  const data = await res.json() as { messages: BeInboxItem[] }
  return (data.messages ?? []).map((m) => mapInboxItem(m, addressId))
}

export async function getEmailDetail(
  addressId: string,
  mailId: string
): Promise<EmailDetail> {
  const res = await fetch(`${BASE}/messages/${mailId}`)
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
