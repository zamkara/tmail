"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

import EmailPreview from "@/components/inbox/email-preview"
import InboxLoading from "@/components/inbox/inbox-loading"
import { useInboxStore } from "@/stores/inbox.store"
import type { EmailDetail } from "@/types"

export default function MailPreviewPage() {
  const { addressId, mailId } = useParams<{ addressId: string; mailId: string }>()
  const [email, setEmail] = useState<EmailDetail | null>(null)
  const markRead = useInboxStore((s) => s.markRead)

  useEffect(() => {
    fetch(`/api/inbox/${mailId}`)
      .then((r) => r.json())
      .then((msg: Record<string, unknown>) => {
        const from = parseFrom(msg.from as string)
        const createdAt = new Date((msg.created_at as number)).toISOString()
        setEmail({
          id: msg.id as string,
          addressId,
          from,
          subject: (msg.subject as string) || "(tanpa subjek)",
          receivedAt: createdAt,
          isRead: true,
          snippet: "",
          bodyHtml: (msg.html as string) || null,
          bodyText: (msg.text as string) ?? "",
          headers: {},
        })
        markRead(msg.id as string)
      })
  }, [addressId, mailId])

  if (!email) return <InboxLoading />
  return <EmailPreview email={email} />
}

function parseFrom(from: string | undefined) {
  if (!from) return { name: null, email: "" }
  const match = from.match(/^(.+?)\s*<(.+?)>$/)
  if (match) return { name: match[1].trim(), email: match[2].trim() }
  return { name: null, email: from.trim() }
}
