"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  InboxIcon,
  MailOpenIcon,
  RefreshCwIcon,
  SearchIcon,
  Trash2Icon,
  XIcon,
  AstroidIcon,
} from "lucide-react"
import { toast } from "sonner"

import CopyButton from "@/components/shared/copy-button"
import DomainAddressSwitcher from "@/components/guest/domain-address-switcher"
import EmailOtpChip from "@/components/inbox/email-otp-chip"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { isValidDomain, normalizeDomain } from "@/lib/domain-validation"
import { resolveDomainSource } from "@/lib/domain-source"
import { cn } from "@/lib/utils"
import { formatRelativeInboxTime, parseInboxSender } from "@/lib/inbox"
import { generateAddress } from "@/services/address.service"
import type { BackendDomainStatus } from "@/services/backend.service"
import { getDomains } from "@/services/domain.service"
import { useAddressStore } from "@/stores/address.store"
import { useAuthStore } from "@/stores/auth.store"
import { useAuroraStore } from "@/stores/aurora.store"
import { useDomainStore } from "@/stores/domain.store"
import { useInboxStore } from "@/stores/inbox.store"
import type {
  Domain,
  EmailDetail,
  EmailItem,
  GeneratedAddress,
} from "@/types"

const DEFAULT_INBOX_REFRESH_MS = 30000
const WEBSOCKET_CONNECTED_REFRESH_MS = 60000
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

interface PublicAppSettings {
  allowGuestAddresses: boolean
  allowWildcardSubdomains: boolean
  inboxRefreshSeconds: number
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

function createGuestAddress(
  domain: { id: string; name: string },
  wildcard: boolean
) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  const randomLocal = Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("")
  const randomSub = Array.from(
    { length: 5 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("")
  const now = new Date()

  return {
    id: `local_${Date.now()}`,
    address: wildcard
      ? `${randomLocal}@${randomSub}.${domain.name}`
      : `${randomLocal}@${domain.name}`,
    domainId: domain.id,
    domainName: domain.name,
    username: null,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
  }
}

function getAddressDomain(address: string) {
  return address.split("@")[1]?.trim().toLowerCase() ?? ""
}

async function fetchDomainStatus(domain: string) {
  return fetchJsonWithTimeout<BackendDomainStatus>(
    `/api/domains/status?domain=${encodeURIComponent(domain)}`
  )
}

function getPublicDomains(domains: Domain[]) {
  return domains.filter((domain) => domain.visibility !== "private")
}

function findMatchingDomain(domainPart: string, domains: Domain[]) {
  const normalizedPart = normalizeDomain(domainPart)
  if (!normalizedPart) return null

  return [...domains]
    .sort((first, second) => second.name.length - first.name.length)
    .find((domain) => {
      const normalizedName = normalizeDomain(domain.name)
      return (
        normalizedPart === normalizedName ||
        normalizedPart.endsWith(`.${normalizedName}`)
      )
    }) ?? null
}

async function fetchJsonWithTimeout<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), INBOX_FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      cache: "no-store",
      ...init,
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
  const resetInbox = useInboxStore((state) => state.resetInbox)
  const domains = useDomainStore((state) => state.domains)
  const setDomains = useDomainStore((state) => state.setDomains)
  const addAddress = useAddressStore((state) => state.addAddress)
  const updateAddress = useAddressStore((state) => state.updateAddress)
  const setActiveAddress = useAddressStore((state) => state.setActiveAddress)
  const user = useAuthStore((state) => state.user)
  const authLoaded = useAuthStore((state) => state.isLoaded)

  const [emails, setEmails] = useState<EmailItem[]>([])
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null)
  const [emailDetails, setEmailDetails] = useState<Record<string, EmailDetail>>(
    {}
  )
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeletingMessages, setIsDeletingMessages] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [isLoadingDomains, setIsLoadingDomains] = useState(false)
  const [appSettings, setAppSettings] = useState<PublicAppSettings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [domainStatus, setDomainStatus] =
    useState<BackendDomainStatus | null>(null)
  const [domainStatusError, setDomainStatusError] = useState<string | null>(
    null
  )
  const [isLoadingDomainStatus, setIsLoadingDomainStatus] = useState(false)
  const [isBackendWebSocketConnected, setIsBackendWebSocketConnected] =
    useState(false)
  const prevEmailCountRef = useRef(0)
  const autoAddressPromiseRef = useRef<Promise<GeneratedAddress> | null>(null)
  const domainLoadStartedRef = useRef(false)
  const triggerAurora = useAuroraStore((state) => state.trigger)

  useEffect(() => {
    removeExpired()
  }, [removeExpired])

  useEffect(() => {
    let cancelled = false

    async function loadSettings() {
      try {
        const data =
          await fetchJsonWithTimeout<PublicAppSettings>("/api/app-settings")
        if (!cancelled) setAppSettings(data)
      } catch {
        if (!cancelled) {
          setAppSettings({
            allowGuestAddresses: true,
            allowWildcardSubdomains: true,
            inboxRefreshSeconds: DEFAULT_INBOX_REFRESH_MS / 1000,
          })
        }
      }
    }

    void loadSettings()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (domainLoadStartedRef.current) return

    let cancelled = false
    domainLoadStartedRef.current = true

    async function loadDomains() {
      setIsLoadingDomains(true)

      try {
        const nextDomains = getPublicDomains(await getDomains())
        if (!cancelled) {
          setDomains(nextDomains)
        }
      } catch (error) {
        console.error("Failed to load domains:", error)
        if (!cancelled) {
          setDomains([])
          toast.error(
            error instanceof Error ? error.message : "Failed to load domains"
          )
        }
      } finally {
        if (!cancelled) setIsLoadingDomains(false)
        if (cancelled) domainLoadStartedRef.current = false
      }
    }

    void loadDomains()

    return () => {
      cancelled = true
    }
  }, [setDomains])

  const publicDomains = useMemo(() => getPublicDomains(domains), [domains])

  const activeAddress = useMemo(
    () =>
      addresses.find(
        (address) =>
          address.id === activeAddressId && isAddressAvailable(address)
      ) ?? null,
    [activeAddressId, addresses]
  )
  const activeAddressEmail = activeAddress?.address ?? null
  const activeAddressDomain = activeAddressEmail
    ? getAddressDomain(activeAddressEmail)
    : ""
  const activeDomainUnavailable = Boolean(
    !isLoadingDomains &&
      activeAddressDomain &&
      !findMatchingDomain(activeAddressDomain, publicDomains)
  )
  const privateDomainMessage =
    "This domain is private. Please contact the domain owner to request access."
  const inboxRefreshMs = useMemo(() => {
    if (isBackendWebSocketConnected) return WEBSOCKET_CONNECTED_REFRESH_MS

    const refreshSeconds = appSettings?.inboxRefreshSeconds
    if (typeof refreshSeconds !== "number") return DEFAULT_INBOX_REFRESH_MS

    return Math.max(30000, refreshSeconds * 1000)
  }, [appSettings?.inboxRefreshSeconds, isBackendWebSocketConnected])

  useEffect(() => {
    if (!activeAddressDomain) {
      setDomainStatus(null)
      setDomainStatusError(null)
      setIsLoadingDomainStatus(false)
      return
    }

    let cancelled = false

    async function loadDomainStatus() {
      setIsLoadingDomainStatus(true)
      setDomainStatusError(null)

      try {
        const status = await fetchDomainStatus(activeAddressDomain)
        if (!cancelled) setDomainStatus(status)
      } catch (error) {
        if (!cancelled) {
          setDomainStatus(null)
          setDomainStatusError(
            error instanceof Error
              ? error.message
              : "Failed to load domain status"
          )
        }
      } finally {
        if (!cancelled) setIsLoadingDomainStatus(false)
      }
    }

    void loadDomainStatus()

    return () => {
      cancelled = true
    }
  }, [activeAddressDomain])

  useEffect(() => {
    if (!authLoaded) return
    if (!user && appSettings?.allowGuestAddresses === false) return
    if (activeAddress) return

    const reusableAddress = addresses.find(isAddressAvailable)
    if (reusableAddress) {
      setActiveAddress(reusableAddress.id)
      return
    }

    const firstAvailableDomain = [...publicDomains].sort((first, second) => {
      const order = { system: 0, user: 1, guest: 2 } as const
      const firstSource = resolveDomainSource(first)
      const secondSource = resolveDomainSource(second)
      if (firstSource !== secondSource) {
        return order[firstSource] - order[secondSource]
      }

      return first.name.localeCompare(second.name)
    })[0]

    if (!firstAvailableDomain || autoAddressPromiseRef.current) return

    autoAddressPromiseRef.current = user
      ? generateAddress(firstAvailableDomain.id, firstAvailableDomain.name, true)
      : Promise.resolve(
          createGuestAddress(
            firstAvailableDomain,
            appSettings?.allowWildcardSubdomains ?? true
          )
        )

    void autoAddressPromiseRef.current
      .then((address) => {
        resetInbox()
        addAddress(address)
        setActiveAddress(address.id)
      })
      .catch((error) => {
        console.error("Failed to create initial email address:", error)
        toast.error(
          error instanceof Error ? error.message : "Failed to create email address"
        )
      })
      .finally(() => {
        autoAddressPromiseRef.current = null
      })
  }, [
    activeAddress,
    addAddress,
    addresses,
    authLoaded,
    appSettings,
    publicDomains,
    resetInbox,
    setActiveAddress,
    user,
  ])

  const loadEmails = useCallback(async () => {
    if (!activeAddress) {
      setEmails([])
      setExpandedEmailId(null)
      setEmailDetails({})
      setError(null)
      return
    }
    if (activeDomainUnavailable) {
      setEmails([])
      setExpandedEmailId(null)
      setEmailDetails({})
      setError(privateDomainMessage)
      return
    }

    setIsLoading(true)
    setError(null)

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
      setError("Failed to load inbox.")
    } finally {
      setIsLoading(false)
    }
  }, [activeAddress, activeDomainUnavailable, privateDomainMessage, readIds])

  async function handleDeleteAllMessages() {
    if (!activeAddress || isDeletingMessages) return

    setIsDeletingMessages(true)

    try {
      const data = await fetchJsonWithTimeout<{
        messages_deleted?: number
      }>(`/api/inbox?address=${encodeURIComponent(activeAddress.address)}`, {
        method: "DELETE",
      })

      setEmails([])
      setExpandedEmailId(null)
      setEmailDetails({})
      setError(null)
      setDeleteConfirmOpen(false)
      toast.success(`Deleted ${data.messages_deleted ?? 0} messages`)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete messages"
      )
    } finally {
      setIsDeletingMessages(false)
    }
  }

  useEffect(() => {
    void loadEmails()

    if (!activeAddress || activeDomainUnavailable) {
      setIsBackendWebSocketConnected(false)
      return
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        void loadEmails()
      }
    }, inboxRefreshMs)

    return () => window.clearInterval(interval)
  }, [activeAddress, activeDomainUnavailable, inboxRefreshMs, loadEmails])

  useEffect(() => {
    function handleBackendUpdate(event: Event) {
      const customEvent = event as CustomEvent<{
        email?: string | null
      }>
      if (customEvent.detail.email && customEvent.detail.email !== activeAddressEmail) {
        return
      }
      void loadEmails()
    }

    function handleBackendWebSocketStatus(event: Event) {
      const customEvent = event as CustomEvent<{
        email?: string | null
        connected?: boolean
      }>
      if (customEvent.detail.email && customEvent.detail.email !== activeAddressEmail) {
        return
      }
      setIsBackendWebSocketConnected(Boolean(customEvent.detail.connected))
    }

    window.addEventListener("tmail:backend-inbox-update", handleBackendUpdate)
    window.addEventListener(
      "tmail:backend-ws-status",
      handleBackendWebSocketStatus
    )
    return () => {
      window.removeEventListener("tmail:backend-inbox-update", handleBackendUpdate)
      window.removeEventListener(
        "tmail:backend-ws-status",
        handleBackendWebSocketStatus
      )
    }
  }, [activeAddressEmail, loadEmails])

  useEffect(() => {
    setExpandedEmailId(null)
    setEmailDetails({})
    setError(null)
  }, [activeAddress?.id])

  async function handleToggleEmail(email: EmailItem) {
    if (!activeAddress) return

    if (expandedEmailId === email.id) {
      setExpandedEmailId(null)
      return
    }

    setExpandedEmailId(email.id)
    setLoadingDetailId(email.id)

    if (!emailDetails[email.id]) {
      try {
        const data = await fetchJsonWithTimeout<BeInboxItem>(
          `/api/inbox/${email.id}`
        )
        const detail = mapEmailDetail(data, activeAddress)
        setEmailDetails((prev) => ({ ...prev, [email.id]: detail }))
        markRead(email.id)
        setEmails((currentEmails) =>
          currentEmails.map((currentEmail) =>
            currentEmail.id === email.id
              ? { ...currentEmail, isRead: true }
              : currentEmail
          )
        )
      } catch {
        setExpandedEmailId(null)
      } finally {
        setLoadingDetailId(null)
      }
    } else {
      setLoadingDetailId(null)
    }
  }

  async function handleGenerateRandomAddress(withSubdomain: boolean) {
    setIsWillcardLoading(true)
    const shouldUseSubdomain =
      withSubdomain && appSettings?.allowWildcardSubdomains !== false
    try {
      if (publicDomains.length === 0) {
        toast.error("No domains available")
        return
      }
      const picked =
        publicDomains[Math.floor(Math.random() * publicDomains.length)]
      const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
      const randomLocal = Array.from(
        { length: 6 },
        () => chars[Math.floor(Math.random() * chars.length)]
      ).join("")
      const randomSub = Array.from(
        { length: 5 },
        () => chars[Math.floor(Math.random() * chars.length)]
      ).join("")
      const now = new Date()
      const address: GeneratedAddress = {
        id: `local_${Date.now()}`,
        address: shouldUseSubdomain
          ? `${randomLocal}@${randomSub}.${picked.name}`
          : `${randomLocal}@${picked.name}`,
        domainId: picked.id,
        domainName: picked.name,
        username: null,
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      }
      resetInbox()
      addAddress(address)
      setActiveAddress(address.id)
      toast.success(
        shouldUseSubdomain ? "Wildcard address generated" : "Address generated"
      )
    } catch {
      toast.error("Failed to enable wildcard subdomain")
    } finally {
      setIsWillcardLoading(false)
    }
  }

  const [searchQuery, setSearchQuery] = useState("")
  const [isMac, setIsMac] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setIsMac(navigator.platform.toLowerCase().includes("mac"))
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (e.key === "Escape") {
        setSearchQuery("")
        searchRef.current?.blur()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const filteredEmails = useMemo(
    () =>
      searchQuery
        ? emails.filter((email) => {
            const q = searchQuery.toLowerCase()
            const sender = (email.from.name ?? email.from.email).toLowerCase()
            return (
              sender.includes(q) ||
              email.subject.toLowerCase().includes(q) ||
              email.snippet.toLowerCase().includes(q)
            )
          })
        : emails,
    [emails, searchQuery]
  )

  const [editAddress, setEditAddress] = useState<string | null>(null)
  const [editAddressValue, setEditAddressValue] = useState("")
  const [isSavingAddressEdit, setIsSavingAddressEdit] = useState(false)

  function startAddressEdit() {
    if (!activeAddress) return
    setEditAddressValue(activeAddress.address)
    setEditAddress(activeAddress.id)
  }

  function rejectAddressEdit(message: string) {
    if (activeAddress) {
      setEditAddressValue(activeAddress.address)
    }
    setEditAddress(null)
    toast.error(message)
  }

  async function saveAddressEdit() {
    if (!activeAddress) return
    if (isSavingAddressEdit) return

    const trimmed = editAddressValue.trim()
    const hasAtSymbol = trimmed.includes("@")
    const atIndex = hasAtSymbol ? trimmed.lastIndexOf("@") : -1
    const currentLocalPart = activeAddress.address.split("@")[0]?.trim() ?? ""
    const localPart = hasAtSymbol
      ? trimmed.slice(0, atIndex).trim()
      : currentLocalPart
    const domainPart = normalizeDomain(
      hasAtSymbol ? trimmed.slice(atIndex + 1) : trimmed
    )

    if (!localPart || /\s/.test(localPart) || localPart.includes("@")) {
      rejectAddressEdit("Invalid email address format")
      return
    }

    if (!isValidDomain(domainPart)) {
      rejectAddressEdit("Invalid domain")
      return
    }

    setIsSavingAddressEdit(true)

    try {
      const matchedDomain = findMatchingDomain(domainPart, publicDomains)

      if (!matchedDomain) {
        rejectAddressEdit(
          "This domain is private or unavailable. Please contact the domain owner to request access."
        )
        return
      }

      updateAddress(activeAddress.id, {
        address: `${localPart}@${domainPart}`,
        domainId: matchedDomain.id,
        domainName: matchedDomain.name,
      })
      setEditAddress(null)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal menyimpan address"
      )
    } finally {
      setIsSavingAddressEdit(false)
    }
  }

  const [useSubdomain, setUseSubdomain] = useState(false)
  const [isWillcardLoading, setIsWillcardLoading] = useState(false)

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col justify-center gap-4">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground shadow">
        {activeAddress ? (
          <>
            <div className="flex items-center gap-2 rounded-lg border bg-muted py-2 ps-4 pe-2">
              {editAddress ? (
                <div className="flex min-w-0 flex-1 items-center gap-0 sm:text-lg">
                  <input
                    type="text"
                    value={editAddressValue}
                    onChange={(e) => setEditAddressValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void saveAddressEdit()
                      if (e.key === "Escape") setEditAddress(null)
                    }}
                    onBlur={() => void saveAddressEdit()}
                    className="min-w-0 flex-1 bg-transparent outline-hidden"
                    placeholder="local@domain.com atau domain.com"
                    disabled={isSavingAddressEdit}
                    autoFocus
                  />
                </div>
              ) : (
                <span
                  className="min-w-0 flex-1 cursor-text truncate sm:text-xl"
                  onClick={() => startAddressEdit()}
                >
                  {activeAddress.address}
                </span>
              )}
              <Card className="rounded-md px-4 py-0 text-primary dark:text-foreground">
                <CopyButton text={activeAddress.address} className="size-10" />
              </Card>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="hidden sm:block">
                <DomainAddressSwitcher hideGenerate />
              </div>
              <div className="flex h-10 items-center justify-between gap-3 rounded-md border px-4">
                <span className="text-sm font-medium">Wildcard Domain</span>
                <Switch
                  aria-label="Wildcard Domain"
                  checked={useSubdomain}
                  disabled={appSettings?.allowWildcardSubdomains === false}
                  onCheckedChange={setUseSubdomain}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={!activeAddress || isWillcardLoading}
                onClick={() => void handleGenerateRandomAddress(useSubdomain)}
                className="w-full justify-start gap-2"
              >
                {isWillcardLoading ? (
                  <Spinner className="size-4" />
                ) : (
                  <AstroidIcon className="size-4" />
                )}
                New Address
              </Button>
            </div>
            {activeDomainUnavailable ? (
              <PrivateDomainNotice message={privateDomainMessage} />
            ) : (
              <DomainStatusSummary
                domain={activeAddressDomain}
                status={domainStatus}
                error={domainStatusError}
                isLoading={isLoadingDomainStatus}
              />
            )}
          </>
        ) : (
          <p className="py-2 text-center text-sm text-muted-foreground">
            Select or generate an email address to start receiving messages.
          </p>
        )}
      </div>
      <Card className="bg-linear-to-b from-card/80 via-card/80 to-card/80 drop-shadow-sm backdrop-blur-lg">
        <CardHeader className="border-b">
          <div className="flex items-center gap-4">
            <CardTitle className="shrink-0">Inbox</CardTitle>
            <div className="flex flex-1 items-center justify-center">
              <InputGroup className="h-8 w-full max-w-full rounded-md border bg-input/30 shadow-none! sm:max-w-sm dark:border-border/40">
                <InputGroupAddon>
                  <SearchIcon className="size-3.5 shrink-0 opacity-50" />
                </InputGroupAddon>
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!activeAddress || activeDomainUnavailable}
                />
                <InputGroupAddon align="inline-end">
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="flex items-center justify-center"
                    >
                      <XIcon className="size-3.5 shrink-0 opacity-50" />
                    </button>
                  ) : (
                    <kbd className="flex items-center gap-0.5 rounded-md border bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {isMac ? "⌘" : "Ctrl"}+K
                    </kbd>
                  )}
                </InputGroupAddon>
              </InputGroup>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Refresh inbox"
              disabled={
                !activeAddress ||
                activeDomainUnavailable ||
                isLoading ||
                isDeletingMessages
              }
              onClick={() => void loadEmails()}
            >
              {isLoading ? <Spinner /> : <RefreshCwIcon />}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              aria-label="Delete all messages"
              disabled={
                !activeAddress ||
                activeDomainUnavailable ||
                emails.length === 0 ||
                isLoading ||
                isDeletingMessages
              }
              onClick={() => setDeleteConfirmOpen(true)}
              className="gap-2"
            >
              {isDeletingMessages ? (
                <Spinner className="size-4" />
              ) : (
                <Trash2Icon className="size-4" />
              )}
              <span className="hidden sm:inline">Delete All Message</span>
            </Button>
            <Dialog
              open={deleteConfirmOpen}
              onOpenChange={setDeleteConfirmOpen}
            >
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Delete all messages?</DialogTitle>
                  <DialogDescription>
                    This will delete all messages for {activeAddress?.address}.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isDeletingMessages}
                    onClick={() => setDeleteConfirmOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={isDeletingMessages}
                    onClick={() => void handleDeleteAllMessages()}
                  >
                    {isDeletingMessages ? (
                      <Spinner className="size-4" />
                    ) : null}
                    Delete messages
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 px-0">
          {!activeAddress ? (
            <Empty className="h-full min-h-60 rounded-none border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <InboxIcon />
                </EmptyMedia>
                <EmptyTitle>No address</EmptyTitle>
                <EmptyDescription>Generate an address first.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : isLoading ? (
            <div className="flex h-full min-h-60 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Spinner />
              <span>Loading emails...</span>
            </div>
          ) : error ? (
            <Empty className="h-full min-h-60 rounded-none border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <InboxIcon />
                </EmptyMedia>
                <EmptyTitle>
                  {activeDomainUnavailable
                    ? "Private domain"
                    : "Inbox unavailable"}
                </EmptyTitle>
                <EmptyDescription>{error}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : emails.length === 0 ? (
            <Empty className="h-full min-h-60 rounded-none border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MailOpenIcon />
                </EmptyMedia>
                <EmptyTitle>No emails yet</EmptyTitle>
                <EmptyDescription>
                  Incoming messages will appear here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : filteredEmails.length === 0 ? (
            <Empty className="h-full min-h-60 rounded-none border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchIcon />
                </EmptyMedia>
                <EmptyTitle>No results</EmptyTitle>
                <EmptyDescription>
                  No emails match your search query.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ScrollArea className="h-full max-h-96 min-h-60 lg:max-h-150">
              <div className="flex flex-col p-2">
                {filteredEmails.map((email, index) => (
                  <div key={email.id}>
                    <EmailItemButton
                      email={email}
                      isExpanded={email.id === expandedEmailId}
                      onToggle={() => void handleToggleEmail(email)}
                    />
                    <div
                      className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                      style={{
                        gridTemplateRows:
                          email.id === expandedEmailId ? "1fr" : "0fr",
                      }}
                    >
                      <div className="overflow-hidden">
                        <EmailDetailContent
                          detail={emailDetails[email.id]}
                          isLoading={loadingDetailId === email.id}
                        />
                      </div>
                    </div>
                    {index < emails.length - 1 && (
                      <Separator className="my-1" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function getSenderInitial(email: EmailItem) {
  const label = email.from.name ?? email.from.email
  return label.slice(0, 1).toUpperCase()
}

function DomainStatusSummary({
  domain,
  status,
  error,
  isLoading,
}: {
  domain: string
  status: BackendDomainStatus | null
  error: string | null
  isLoading: boolean
}) {
  if (!domain) return null

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        <Spinner className="size-4" />
        <span>Checking domain status for {domain}...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
        <Badge variant="destructive">Status unknown</Badge>
        <span className="min-w-0 text-muted-foreground">{error}</span>
      </div>
    )
  }

  if (!status) return null

  const isValid = status.active && status.approved && status.mx_valid
  const uptime = status.uptime_label ?? `${status.uptime_days} days`

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
      <span className="min-w-0 truncate font-medium">{status.domain}</span>
      <Badge
        variant={isValid ? "default" : "destructive"}
        className={cn(isValid && "bg-emerald-600 text-white")}
      >
        {status.approved ? "Approved" : "Not approved"}
      </Badge>
      <Badge variant={status.active ? "outline" : "destructive"}>
        {status.active ? "Active" : "Inactive"}
      </Badge>
      <Badge variant={status.mx_valid ? "outline" : "destructive"}>
        {status.mx_valid ? "MX valid" : "MX invalid"}
      </Badge>
      <span className="text-muted-foreground">Uptime {uptime}</span>
    </div>
  )
}

function PrivateDomainNotice({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm">
      <div className="font-medium text-destructive">Private domain</div>
      <div className="text-muted-foreground">{message}</div>
    </div>
  )
}

function EmailItemButton({
  email,
  isExpanded,
  onToggle,
}: {
  email: EmailItem
  isExpanded: boolean
  onToggle: () => void
}) {
  const senderName = email.from.name ?? email.from.email

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "flex w-full min-w-0 items-start gap-3 rounded-lg p-3 text-left hover:bg-muted",
        isExpanded && "bg-muted"
      )}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onToggle()
        }
      }}
    >
      <Avatar>
        <AvatarFallback>{getSenderInitial(email)}</AvatarFallback>
      </Avatar>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex min-w-0 items-center gap-2">
          {!email.isRead && (
            <span className="size-2 rounded-full bg-primary" aria-hidden />
          )}
          <span className="truncate text-sm font-medium">{senderName}</span>
        </span>
        <span
          className={cn(
            "max-w-[25ch] truncate text-sm",
            !email.isRead && "font-semibold"
          )}
        >
          {email.subject}
        </span>
        <span className="line-clamp-2 text-sm text-muted-foreground">
          {email.snippet}
        </span>
      </span>
      <span className="flex w-24 shrink-0 flex-col items-end gap-1">
        <span className="text-xs text-muted-foreground">
          {formatRelativeInboxTime(email.receivedAt)}
        </span>
        <EmailOtpChip
          subject={email.subject}
          snippet={email.snippet}
          className="max-w-full"
        />
      </span>
    </div>
  )
}

function formatFullDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value))
}

function EmailDetailContent({
  detail,
  isLoading,
}: {
  detail: EmailDetail | undefined
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Spinner />
        <span>Loading email...</span>
      </div>
    )
  }

  if (!detail) return null

  const senderName = detail.from.name ?? detail.from.email

  return (
    <div className="border-t px-6 py-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-normal">
          {detail.subject}
        </h1>
        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          <p>
            From <span className="text-foreground">{senderName}</span> &lt;
            {detail.from.email}&gt;
          </p>
          <p>{formatFullDate(detail.receivedAt)}</p>
        </div>
      </div>
      <div className="mt-4">
        <div className="airmail-stripe h-4 w-full rounded-t-lg" />
        <div className="min-h-60 border-y bg-background">
          {detail.bodyHtml ? (
            <iframe
              title={detail.subject}
              srcDoc={`<style>html,body{background:transparent!important;margin:0}</style>${detail.bodyHtml}`}
              sandbox="allow-same-origin"
              className="h-96 w-full bg-background"
            />
          ) : (
            <pre className="min-h-60 p-4 font-sans text-sm whitespace-pre-wrap">
              {detail.bodyText}
            </pre>
          )}
        </div>
        <div className="airmail-stripe h-4 w-full rounded-b-lg" />
      </div>
    </div>
  )
}
