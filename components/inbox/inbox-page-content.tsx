"use client"

import { useEffect, useState } from "react"

import EmailPreview from "@/components/inbox/email-preview"
import InboxEmpty from "@/components/inbox/inbox-empty"
import { Spinner } from "@/components/ui/spinner"
import {
  buildInboxHref,
  getMailIdFromSlug,
  parseInboxSender,
  resolveActiveAddress,
} from "@/lib/inbox"
import { useAddressStore } from "@/stores/address.store"
import { useInboxStore } from "@/stores/inbox.store"
import type { EmailDetail } from "@/types"

interface InboxPageContentProps {
  slug?: string[]
}

interface BeMessage {
  id: string
  from: string
  subject: string
  timestamp?: number
  created_at?: number
  text?: string
  html?: string | false
}

export default function InboxPageContent({ slug }: InboxPageContentProps) {
  const addresses = useAddressStore((s) => s.addresses)
  const activeAddressId = useAddressStore((s) => s.activeAddressId)
  const isAddressLoaded = useAddressStore((s) => s.isLoaded)
  const markRead = useInboxStore((s) => s.markRead)
  const activeAddress = resolveActiveAddress(
    addresses,
    { slug },
    activeAddressId
  )
  const mailId = getMailIdFromSlug(slug, activeAddress)
  const [email, setEmail] = useState<EmailDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!mailId || !activeAddress) {
      setEmail(null)
      setError(null)
      return
    }

    let cancelled = false
    const address = activeAddress
    const id = mailId

    async function loadEmail() {
      setIsLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/inbox/${id}`, { cache: "no-store" })
        const data = (await res.json()) as BeMessage | { error?: string }
        if (!res.ok) {
          throw new Error("error" in data ? data.error : undefined)
        }
        if (cancelled) return

        const message = data as BeMessage
        setEmail(mapEmailDetail(message, buildInboxHref(address)))
        markRead(id)
      } catch (err) {
        if (!cancelled) {
          setEmail(null)
          setError(
            err instanceof Error && err.message
              ? err.message
              : "Email tidak ditemukan"
          )
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void loadEmail()

    return () => {
      cancelled = true
    }
  }, [activeAddress, mailId, markRead])

  if (!isAddressLoaded) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
        <Spinner />
        <span>Loading inbox...</span>
      </div>
    )
  }

  if (!activeAddress) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <InboxEmpty
          title="Select address"
          description="Select an email address to view inbox."
        />
      </div>
    )
  }

  if (!mailId) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <InboxEmpty description="Select an email from the list to read." />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
        <Spinner />
        <span>Loading email...</span>
      </div>
    )
  }

  if (error || !email) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <InboxEmpty
          title="Email not found"
          description={error ?? "This email is not available."}
        />
      </div>
    )
  }

  return <EmailPreview email={email} />
}

function mapEmailDetail(message: BeMessage, addressId: string): EmailDetail {
  const receivedAt = message.created_at ?? message.timestamp ?? Date.now()

  return {
    id: message.id,
    addressId,
    from: parseInboxSender(message.from),
    subject: message.subject || "(no subject)",
    receivedAt: new Date(receivedAt).toISOString(),
    isRead: true,
    snippet: "",
    bodyHtml: message.html || null,
    bodyText: message.text ?? "",
    headers: {},
  }
}
