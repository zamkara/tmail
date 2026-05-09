"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import GuestMailListCard from "@/components/guest/guest-mail-list-card"
import GuestMailPreviewCard from "@/components/guest/guest-mail-preview-card"
import { parseInboxSender } from "@/lib/inbox"
import { useAddressStore } from "@/stores/address.store"
import { useAuroraStore } from "@/stores/aurora.store"
import { useInboxStore } from "@/stores/inbox.store"
import type { EmailDetail, EmailItem, GeneratedAddress } from "@/types"

const INBOX_REFRESH_MS = 15000
const INBOX_FETCH_TIMEOUT_MS = 8000

interface BeInboxItem {
  id: string
  from: string
  subject: string
  timestamp?: number
  created_at?: number
  text?: string
  html?: string | false
}

function isAddressAvailable(address: GeneratedAddress) {
  return new Date(address.expiresAt).getTime() > Date.now()
}

function getMessageTime(message: BeInboxItem) {
  return message.created_at ?? message.timestamp ?? Date.now()
}

function extractMessages(data: unknown): BeInboxItem[] {
  if (Array.isArray(data)) return data as BeInboxItem[]
  if (
    data &&
    typeof data === "object" &&
    "messages" in data &&
    Array.isArray(data.messages)
  ) {
    return data.messages as BeInboxItem[]
  }

  return []
}

function mapEmailItem(
  message: BeInboxItem,
  address: GeneratedAddress,
  isRead: boolean
): EmailItem {
  return {
    id: message.id,
    addressId: address.id,
    from: parseInboxSender(message.from),
    subject: message.subject || "(no subject)",
    receivedAt: new Date(getMessageTime(message)).toISOString(),
    isRead,
    snippet: message.text ?? "",
  }
}

function mapEmailDetail(
  message: BeInboxItem,
  address: GeneratedAddress
): EmailDetail {
  return {
    ...mapEmailItem(message, address, true),
    bodyHtml: message.html || null,
    bodyText: message.text ?? "",
    headers: {},
  }
}

async function fetchJsonWithTimeout<T>(url: string): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), INBOX_FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    })

    const data = (await res.json()) as T
    if (!res.ok) {
      const message =
        data && typeof data === "object" && "error" in data
          ? String(data.error)
          : "Request failed"
      throw new Error(message)
    }

    return data
  } finally {
    clearTimeout(timeout)
  }
}

export default function GuestMailWorkspace() {
  const addresses = useAddressStore((state) => state.addresses)
  const activeAddressId = useAddressStore((state) => state.activeAddressId)
  const removeExpired = useAddressStore((state) => state.removeExpired)
  const readIds = useInboxStore((state) => state.readIds)
  const markRead = useInboxStore((state) => state.markRead)

  const [emails, setEmails] = useState<EmailItem[]>([])
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
  const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null)
  const [isListLoading, setIsListLoading] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const prevEmailCountRef = useRef(0)
  const triggerAurora = useAuroraStore((state) => state.trigger)

  useEffect(() => {
    removeExpired()
  }, [removeExpired])

  const activeAddress = useMemo(
    () =>
      addresses.find(
        (address) =>
          address.id === activeAddressId && isAddressAvailable(address)
      ) ?? null,
    [activeAddressId, addresses]
  )

  const loadEmails = useCallback(async () => {
    if (!activeAddress) {
      setEmails([])
      setSelectedEmailId(null)
      setSelectedEmail(null)
      setListError(null)
      return
    }

    setIsListLoading(true)
    setListError(null)

    try {
      const data = await fetchJsonWithTimeout<unknown>(
        `/api/inbox?address=${encodeURIComponent(activeAddress.address)}`
      )
      const nextEmails = extractMessages(data).map((message) =>
        mapEmailItem(message, activeAddress, readIds.has(message.id))
      )

      if (nextEmails.length > prevEmailCountRef.current) {
        triggerAurora()
      }
      prevEmailCountRef.current = nextEmails.length

      setEmails(nextEmails)
    } catch {
      setEmails([])
      setListError("Failed to load inbox.")
    } finally {
      setIsListLoading(false)
    }
  }, [activeAddress, readIds])

  useEffect(() => {
    void loadEmails()

    if (!activeAddress) return

    const interval = window.setInterval(() => {
      void loadEmails()
    }, INBOX_REFRESH_MS)

    return () => window.clearInterval(interval)
  }, [activeAddress, loadEmails])

  useEffect(() => {
    setSelectedEmailId(null)
    setSelectedEmail(null)
    setDetailError(null)
  }, [activeAddress?.id])

  async function handleSelectEmail(email: EmailItem) {
    if (!activeAddress) return

    setSelectedEmailId(email.id)
    setSelectedEmail(null)
    setIsDetailLoading(true)
    setDetailError(null)

    try {
      const data = await fetchJsonWithTimeout<BeInboxItem>(
        `/api/inbox/${email.id}`
      )
      const detail = mapEmailDetail(data, activeAddress)
      setSelectedEmail(detail)
      markRead(email.id)
      setEmails((currentEmails) =>
        currentEmails.map((currentEmail) =>
          currentEmail.id === email.id
            ? { ...currentEmail, isRead: true }
            : currentEmail
        )
      )
    } catch {
      setDetailError("Failed to open email.")
    } finally {
      setIsDetailLoading(false)
    }
  }

  return (
    <div className="mx-auto grid min-h-[calc(100svh-6rem)] w-full max-w-7xl grid-cols-1 gap-4 lg:h-[calc(90svh-6rem)] lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <GuestMailPreviewCard
        activeAddress={activeAddress}
        email={selectedEmail}
        isLoading={isDetailLoading}
        error={detailError}
      />
      <GuestMailListCard
        activeAddress={activeAddress}
        emails={emails}
        selectedEmailId={selectedEmailId}
        isLoading={isListLoading}
        error={listError}
        onRefresh={() => void loadEmails()}
        onSelectEmail={(email) => void handleSelectEmail(email)}
      />
    </div>
  )
}
