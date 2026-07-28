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
import Image from "next/image"
import { useSearchParams } from "next/navigation"
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
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { isValidDomain, normalizeDomain } from "@/lib/domain-validation"
import { resolveDomainSource } from "@/lib/domain-source"
import { cn } from "@/lib/utils"
import {
  formatRelativeInboxTime,
  parseInboxSender,
} from "@/lib/inbox"
import { generateAddress } from "@/services/address.service"
import type { BackendDomainStatus } from "@/services/backend.service"
import { getDomains } from "@/services/domain.service"
import { useAddressStore } from "@/stores/address.store"
import { useAuthStore } from "@/stores/auth.store"
import { useAuroraStore } from "@/stores/aurora.store"
import { useDomainStore } from "@/stores/domain.store"
import { useInboxStore } from "@/stores/inbox.store"
import { useCopy } from "@/hooks/use-copy"
import type {
  Domain,
  EmailDetail,
  EmailItem,
  GeneratedAddress,
} from "@/types"

const DEFAULT_INBOX_REFRESH_MS = 5000
const WEBSOCKET_CONNECTED_REFRESH_MS = 60000
const INBOX_FETCH_TIMEOUT_MS = 8000
const DEFAULT_AURORA_COLOR_STOPS: [string, string, string] = [
  "#dc67ff",
  "#420e73",
  "#420e73",
]
const OTP_AURORA_COLOR_STOPS: [string, string, string] = [
  "#443d8d",
  "#443d8d",
  "#443d8d",
]

interface BeInboxItem {
  id: string
  from: string
  subject: string
  timestamp?: number
  created_at?: number
  text?: string
  html?: string | false
  is_otp?: boolean
  otp?: string | null
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
    otp: message.otp ?? null,
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
  const chars = "abcdefghijklmnopqrstuvwxyz"
  const randomLocal = Array.from(
    { length: 7 },
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

function normalizeEmailAddress(value: string) {
  const trimmed = value.trim().toLowerCase()
  const atIndex = trimmed.lastIndexOf("@")
  if (atIndex <= 0) return null

  const localPart = trimmed.slice(0, atIndex).trim()
  const domainPart = normalizeDomain(trimmed.slice(atIndex + 1))

  if (!localPart || /\s/.test(localPart) || localPart.includes("@")) {
    return null
  }
  if (!domainPart || !isValidDomain(domainPart)) return null

  return {
    address: `${localPart}@${domainPart}`,
    domainPart,
    localPart,
  }
}

async function fetchDomainStatus(domain: string) {
  return fetchJsonWithTimeout<BackendDomainStatus>(
    `/api/domains/status?domain=${encodeURIComponent(domain)}`
  )
}

function getPublicDomains(domains: Domain[]) {
  return domains.filter(
    (domain) =>
      domain.visibility !== "private" &&
      domain.isVerified !== false &&
      domain.isBanned !== true
  )
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

function getDomainLookupCandidates(domainPart: string) {
  const normalizedPart = normalizeDomain(domainPart)
  if (!normalizedPart) return []

  const labels = normalizedPart.split(".").filter(Boolean)
  const candidates: string[] = []

  for (let index = 0; index <= labels.length - 2; index += 1) {
    candidates.push(labels.slice(index).join("."))
  }

  return candidates
}

async function fetchBestDomainStatus(domainPart: string) {
  const candidates = getDomainLookupCandidates(domainPart)
  let fallbackStatus: BackendDomainStatus | null = null

  for (const candidate of candidates) {
    try {
      const status = await fetchDomainStatus(candidate)
      fallbackStatus ??= status

      if (status.registered || status.visibility === "private") {
        return status
      }
    } catch {
      // Keep checking parent domains so wildcard subdomains can resolve
      // to a registered private root domain.
    }
  }

  return fallbackStatus
}

function getGuestDomainAccessMessage(
  status: BackendDomainStatus | null,
  fallbackDomain?: string
) {
  if (isRegisteredPrivateDomain(status)) {
    return "This domain is registered for private use only. Please contact the domain owner to request access."
  }

  const domain = status?.domain ?? fallbackDomain
  const requiredMx = status?.required_mx

  if (!status || !status.active || !status.approved || !status.mx_valid) {
    return requiredMx
      ? `This domain is not available yet. Please set the MX record for ${domain ?? "this domain"} to ${requiredMx} first, then try again.`
      : "This domain is not available yet. Please set the correct MX record first, then try again."
  }

  return "This domain is registered and cannot be used by guests. Please contact the domain owner to request access."
}

function isRegisteredPrivateDomain(status: BackendDomainStatus | null) {
  if (!status?.registered) return false

  return status.visibility === null || status.visibility === "private"
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

export default function GuestMailWorkspace({
  initialEmail,
}: {
  initialEmail?: string
}) {
  const searchParams = useSearchParams()
  const addresses = useAddressStore((state) => state.addresses)
  const activeAddressId = useAddressStore((state) => state.activeAddressId)
  const addressLoaded = useAddressStore((state) => state.isLoaded)
  const removeExpired = useAddressStore((state) => state.removeExpired)
  const readIds = useInboxStore((state) => state.readIds)
  const markRead = useInboxStore((state) => state.markRead)
  const resetInbox = useInboxStore((state) => state.resetInbox)
  const domains = useDomainStore((state) => state.domains)
  const setDomains = useDomainStore((state) => state.setDomains)
  const addAddress = useAddressStore((state) => state.addAddress)
  const addAddressAndSetActive = useAddressStore(
    (state) => state.addAddressAndSetActive
  )
  const updateAddress = useAddressStore((state) => state.updateAddress)
  const removeAddress = useAddressStore((state) => state.removeAddress)
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
  const appliedUrlEmailRef = useRef<string | null>(null)
  const generateAddressLockRef = useRef(false)
  const domainStatusRequestRef = useRef(0)
  const otpCacheRef = useRef<Map<string, string | null>>(new Map())
  const triggerAurora = useAuroraStore((state) => state.trigger)
  const { copy: copyToClipboard } = useCopy()

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
  const requestedEmail = initialEmail ?? searchParams.get("email")
  const hasRequestedEmail = Boolean(requestedEmail)

  useEffect(() => {
    if (!addressLoaded || isLoadingDomains) return

    const emailParam = requestedEmail
    if (!emailParam || appliedUrlEmailRef.current === emailParam) return

    const cleanUrl = () => {
      if (typeof window === "undefined") return
      if (initialEmail || window.location.search.includes("email=")) {
        window.history.replaceState(null, "", "/")
      }
    }

    const parsed = normalizeEmailAddress(emailParam)
    if (!parsed) {
      appliedUrlEmailRef.current = emailParam
      cleanUrl()
      toast.error("Invalid email URL")
      return
    }

    const matchedDomain = findMatchingDomain(parsed.domainPart, publicDomains)
    if (!matchedDomain) {
      const existingAddress = addresses.find(
        (address) =>
          address.address.toLowerCase() === parsed.address &&
          isAddressAvailable(address)
      )

      if (existingAddress) {
        resetInbox()
        setActiveAddress(existingAddress.id)
        appliedUrlEmailRef.current = emailParam
        cleanUrl()
        return
      }

      const now = new Date()
      const address: GeneratedAddress = {
        id: `url:${parsed.address}`,
        address: parsed.address,
        domainId: `url:${parsed.domainPart}`,
        domainName: parsed.domainPart,
        username: null,
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      }

      resetInbox()
      addAddressAndSetActive(address)
      appliedUrlEmailRef.current = emailParam
      cleanUrl()
      void fetchBestDomainStatus(parsed.domainPart).then((status) => {
        toast.error(getGuestDomainAccessMessage(status, parsed.domainPart))
      })
      return
    }

    const existingAddress = addresses.find(
      (address) =>
        address.address.toLowerCase() === parsed.address &&
        isAddressAvailable(address)
    )

    if (existingAddress) {
      resetInbox()
      setActiveAddress(existingAddress.id)
      appliedUrlEmailRef.current = emailParam
      cleanUrl()
      return
    }

    const now = new Date()
    const address: GeneratedAddress = {
      id: `url:${parsed.address}`,
      address: parsed.address,
      domainId: matchedDomain.id,
      domainName: matchedDomain.name,
      username: null,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    }

    resetInbox()
    addAddressAndSetActive(address)
    appliedUrlEmailRef.current = emailParam
    cleanUrl()
  }, [
    addAddress,
    addAddressAndSetActive,
    addressLoaded,
    addresses,
    initialEmail,
    isLoadingDomains,
    publicDomains,
    resetInbox,
    requestedEmail,
    searchParams,
    setActiveAddress,
  ])

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
  const activeMatchedPublicDomain = activeAddressDomain
    ? findMatchingDomain(activeAddressDomain, publicDomains)
    : null
  const activeDomainUnavailable = Boolean(
    !isLoadingDomains &&
      activeAddressDomain &&
      !activeMatchedPublicDomain
  )
  const domainAccessMessage = getGuestDomainAccessMessage(
    domainStatus,
    activeAddressDomain
  )
  const inboxRefreshMs = useMemo(() => {
    if (isBackendWebSocketConnected) return WEBSOCKET_CONNECTED_REFRESH_MS

    const refreshSeconds = appSettings?.inboxRefreshSeconds
    if (typeof refreshSeconds !== "number") return DEFAULT_INBOX_REFRESH_MS

    return Math.max(5000, refreshSeconds * 1000)
  }, [appSettings?.inboxRefreshSeconds, isBackendWebSocketConnected])

  useEffect(() => {
    if (user) return
    if (hasRequestedEmail) return
    if (isLoadingDomains) return
    if (!activeAddress || !activeDomainUnavailable) return

    removeAddress(activeAddress.id)
    resetInbox()
  }, [
    activeAddress,
    activeDomainUnavailable,
    hasRequestedEmail,
    isLoadingDomains,
    removeAddress,
    resetInbox,
    user,
  ])

  useEffect(() => {
    const requestId = domainStatusRequestRef.current + 1
    domainStatusRequestRef.current = requestId

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
        const status = activeMatchedPublicDomain
          ? await fetchDomainStatus(activeMatchedPublicDomain.name)
          : await fetchBestDomainStatus(activeAddressDomain)
        if (!cancelled && domainStatusRequestRef.current === requestId) {
          setDomainStatus(status)
        }
      } catch (error) {
        if (!cancelled && domainStatusRequestRef.current === requestId) {
          setDomainStatus(null)
          setDomainStatusError(
            error instanceof Error
              ? error.message
              : "Failed to load domain status"
          )
        }
      } finally {
        if (!cancelled && domainStatusRequestRef.current === requestId) {
          setIsLoadingDomainStatus(false)
        }
      }
    }

    void loadDomainStatus()

    return () => {
      cancelled = true
    }
  }, [activeAddressDomain, activeMatchedPublicDomain])

  useEffect(() => {
    if (!authLoaded) return
    if (!addressLoaded) return
    if (hasRequestedEmail && appliedUrlEmailRef.current !== requestedEmail) return
    if (!user && appSettings?.allowGuestAddresses === false) return
    if (activeAddress) return

    const reusableAddress = addresses.find((address) => {
      if (!isAddressAvailable(address)) return false
      if (user) return true

      return Boolean(findMatchingDomain(getAddressDomain(address.address), publicDomains))
    })
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
          createGuestAddress(firstAvailableDomain, false)
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
    addressLoaded,
    addresses,
    authLoaded,
    hasRequestedEmail,
    appSettings,
    publicDomains,
    requestedEmail,
    resetInbox,
    setActiveAddress,
    user,
  ])

  const loadEmails = useCallback(async (silent = false) => {
    if (generateAddressLockRef.current) return

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
      setError(domainAccessMessage)
      return
    }

    if (!silent) {
      setIsLoading(true)
      setError(null)
    }

    try {
      const data = await fetchJsonWithTimeout<unknown>(
        `/api/inbox?address=${encodeURIComponent(activeAddress.address)}`
      )
      const nextEmails = await Promise.all(
        extractMessages(data).map(async (message) => {
          const email = mapEmailItem(
            message,
            activeAddress,
            readIds.has(message.id)
          )
          const cachedOtp = otpCacheRef.current.get(email.id)

          if (email.otp) {
            otpCacheRef.current.set(email.id, email.otp)
            return email
          }

          if (cachedOtp !== undefined) {
            return { ...email, otp: cachedOtp }
          }

          if (!message.is_otp) return email

          try {
            const detailData = await fetchJsonWithTimeout<BeInboxItem>(
              `/api/inbox/${email.id}`
            )
            const otp = detailData.otp ?? null
            otpCacheRef.current.set(email.id, otp)
            return { ...email, otp }
          } catch {
            otpCacheRef.current.set(email.id, null)
            return email
          }
        })
      )

      if (nextEmails.length > prevEmailCountRef.current) {
        triggerAurora(
          nextEmails.some((email) => email.otp)
            ? OTP_AURORA_COLOR_STOPS
            : DEFAULT_AURORA_COLOR_STOPS
        )
      }
      prevEmailCountRef.current = nextEmails.length

      setEmails(nextEmails)
    } catch {
      if (!silent) {
        setEmails([])
        setError("Failed to load inbox.")
      }
    } finally {
      if (!silent) {
        setIsLoading(false)
      }
    }
  }, [activeAddress, activeDomainUnavailable, domainAccessMessage, readIds])

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
        void loadEmails(true)
      }
    }, inboxRefreshMs)

    return () => window.clearInterval(interval)
  }, [activeAddress, activeDomainUnavailable, inboxRefreshMs, loadEmails])

  useEffect(() => {
    function handleBackendUpdate(event: Event) {
      const customEvent = event as CustomEvent<{
        email?: string | null
        message?: BeInboxItem | null
      }>
      if (customEvent.detail.email && customEvent.detail.email !== activeAddressEmail) {
        return
      }

      if (activeAddress && customEvent.detail.message?.id) {
        const nextEmail = mapEmailItem(
          customEvent.detail.message,
          activeAddress,
          readIds.has(customEvent.detail.message.id)
        )
        if (nextEmail.otp) {
          otpCacheRef.current.set(nextEmail.id, nextEmail.otp)
        }
        setEmails((currentEmails) => {
          const withoutCurrent = currentEmails.filter(
            (email) => email.id !== nextEmail.id
          )
          return [nextEmail, ...withoutCurrent]
        })
        setError(null)
        triggerAurora(
          nextEmail.otp ? OTP_AURORA_COLOR_STOPS : DEFAULT_AURORA_COLOR_STOPS
        )
        return
      }

      void loadEmails(true)
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
  }, [activeAddress, activeAddressEmail, loadEmails, readIds, triggerAurora])

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
        if (detail.otp) {
          otpCacheRef.current.set(email.id, detail.otp)
        }
        setEmailDetails((prev) => ({ ...prev, [email.id]: detail }))
        markRead(email.id)
        setEmails((currentEmails) =>
          currentEmails.map((currentEmail) =>
            currentEmail.id === email.id
              ? {
                  ...currentEmail,
                  isRead: true,
                  snippet: detail.bodyText || currentEmail.snippet,
                  otp: detail.otp ?? currentEmail.otp,
                }
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

  async function handleGenerateRandomAddress() {
    if (generateAddressLockRef.current) return
    generateAddressLockRef.current = true
    setIsWillcardLoading(true)

    try {
      if (publicDomains.length === 0) {
        toast.error("No domains available")
        return
      }
      const picked =
        publicDomains[Math.floor(Math.random() * publicDomains.length)]
      const chars = "abcdefghijklmnopqrstuvwxyz"
      const randomLocal = Array.from(
        { length: 7 },
        () => chars[Math.floor(Math.random() * chars.length)]
      ).join("")
      const now = new Date()
      const address: GeneratedAddress = {
        id: `local_${Date.now()}`,
        address: `${randomLocal}@${picked.name}`,
        domainId: picked.id,
        domainName: picked.name,
        username: null,
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      }
      resetInbox()
      addAddressAndSetActive(address)
      toast.success("Address generated")
    } catch {
      toast.error("Failed to generate address")
    } finally {
      generateAddressLockRef.current = false
      setIsWillcardLoading(false)
    }
  }

  const [searchQuery, setSearchQuery] = useState("")
  const [isMac, setIsMac] = useState(false)
  const [siteOrigin, setSiteOrigin] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setIsMac(navigator.platform.toLowerCase().includes("mac"))
    setSiteOrigin(window.location.origin)
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
        updateAddress(activeAddress.id, {
          address: `${localPart}@${domainPart}`,
          domainId: `url:${domainPart}`,
          domainName: domainPart,
        })
        resetInbox()
        setEmails([])
        setExpandedEmailId(null)
        setEmailDetails({})
        setEditAddress(null)
        return
      }

      updateAddress(activeAddress.id, {
        address: `${localPart}@${domainPart}`,
        domainId: matchedDomain.id,
        domainName: matchedDomain.name,
      })
      resetInbox()
      setEditAddress(null)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal menyimpan address"
      )
    } finally {
      setIsSavingAddressEdit(false)
    }
  }

  const [isWillcardLoading, setIsWillcardLoading] = useState(false)
  const activeAddressHref = activeAddress
    ? `/${activeAddress.address}`
    : ""
  const activeAddressPublicUrl =
    activeAddress && siteOrigin ? `${siteOrigin}${activeAddressHref}` : ""

  async function handleCopyPublicUrl() {
    if (!activeAddressPublicUrl) return

    try {
      await copyToClipboard(activeAddressPublicUrl)
      toast.success("Email URL copied")
    } catch {
      toast.error("Failed to copy email URL")
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 rounded-xl border bg-card p-5 text-card-foreground shadow">
        {activeAddress ? (
          <>
            <div className="space-y-2 text-center">
              <Image
                src="/banner-guest-black.svg"
                alt="Premiumisme Email"
                width={520}
                height={116}
                className="mx-auto h-[88px] w-full max-w-[380px] object-contain dark:hidden sm:h-[116px] sm:max-w-[520px]"
                priority
              />
              <Image
                src="/banner-guest-white.svg"
                alt="Premiumisme Email"
                width={520}
                height={116}
                className="mx-auto hidden h-[88px] w-full max-w-[380px] object-contain dark:block sm:h-[116px] sm:max-w-[520px]"
                priority
              />
              <p className="text-sm text-muted-foreground sm:text-base">
                Create temporary email easily, quickly, and practically.
              </p>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-2">
              <div className="flex h-10 min-w-0 items-center rounded-md border bg-background">
                {editAddress ? (
                  <div className="flex min-w-0 flex-1 items-center gap-0 px-3 sm:text-lg">
                    <input
                      type="text"
                      value={editAddressValue}
                      onChange={(e) => setEditAddressValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void saveAddressEdit()
                        if (e.key === "Escape") setEditAddress(null)
                      }}
                      onBlur={() => void saveAddressEdit()}
                      className="min-w-0 flex-1 bg-transparent text-center outline-hidden"
                      placeholder="local@domain.com or domain.com"
                      disabled={isSavingAddressEdit}
                      autoFocus
                    />
                  </div>
                ) : (
                  <span
                    className="min-w-0 flex-1 cursor-text truncate px-3 text-center text-base font-medium sm:text-xl"
                    onClick={() => startAddressEdit()}
                  >
                    {activeAddress.address}
                  </span>
                )}
              </div>
              <DomainAddressSwitcher hideGenerate trigger="icon" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-lg"
                    aria-label="Generate new email address"
                    disabled={!activeAddress || isWillcardLoading}
                    onClick={() => void handleGenerateRandomAddress()}
                  >
                    {isWillcardLoading ? (
                      <Spinner className="size-4" />
                    ) : (
                      <AstroidIcon className="size-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Generate new email address</TooltipContent>
              </Tooltip>
              <CopyButton
                text={activeAddress.address}
                className="size-10 rounded-md border text-primary dark:text-foreground"
              />
            </div>
            {activeAddressPublicUrl ? (
              <button
                type="button"
                className="text-center text-sm leading-relaxed text-muted-foreground hover:text-foreground hover:underline"
                onClick={() => void handleCopyPublicUrl()}
              >
                {activeAddressPublicUrl}
              </button>
            ) : null}
            {activeDomainUnavailable ? (
              <PrivateDomainNotice
                isPrivate={
                  Boolean(domainStatus?.registered) &&
                  domainStatus?.visibility === "private"
                }
                isLoading={isLoadingDomainStatus}
                message={domainAccessMessage}
              />
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
              variant="default"
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
              className="gap-2 bg-[#fb2c36] text-white hover:bg-[#fb2c36]/90 disabled:bg-[#fb2c36] disabled:text-white disabled:opacity-60"
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
                    className="bg-[#fb2c36] text-white hover:bg-[#fb2c36]/90"
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
            <div className="max-h-96 min-h-60 overflow-y-auto lg:max-h-150">
              <div className="flex flex-col p-2">
                {filteredEmails.map((email, index) => (
                  <div key={email.id}>
                    <EmailItemButton
                      email={email}
                      isExpanded={email.id === expandedEmailId}
                      onToggle={() => void handleToggleEmail(email)}
                    />
                    {email.id === expandedEmailId ? (
                      <EmailDetailContent
                        detail={emailDetails[email.id]}
                        isLoading={loadingDetailId === email.id}
                      />
                    ) : null}
                    {index < emails.length - 1 && (
                      <Separator className="my-1" />
                    )}
                  </div>
                ))}
              </div>
            </div>
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
      <div className="flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <Spinner className="size-4" />
        <span>Checking domain status for {domain}...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-1 text-center text-sm">
        <div className="font-medium text-[#fb2c36]">Email not supported</div>
        <div className="text-[#fb2c36]">{error}</div>
      </div>
    )
  }

  if (!status) return null

  const isValid =
    status.active &&
    status.approved &&
    status.mx_valid &&
    !isRegisteredPrivateDomain(status)
  const uptime = status.uptime_label ?? `${status.uptime_days} days`

  return (
    <div className="space-y-1 text-center text-sm">
      <div
        className={cn(
          "font-medium",
          isValid ? "text-emerald-500" : "text-[#fb2c36]"
        )}
      >
        {isValid ? `Email approved (uptime ${uptime})` : "Email not supported"}
      </div>
      {!isValid ? (
        <div className="text-[#fb2c36]">
          {getGuestDomainAccessMessage(status, domain)}
        </div>
      ) : null}
    </div>
  )
}

function PrivateDomainNotice({
  isPrivate,
  isLoading,
  message,
}: {
  isPrivate: boolean
  isLoading: boolean
  message: string
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <Spinner className="size-4" />
        <span>Checking domain status...</span>
      </div>
    )
  }

  return (
    <div className="space-y-1 text-center text-sm">
      <div className="font-medium text-[#fb2c36]">
        Email not supported
      </div>
      <div className="text-[#fb2c36]">
        {isPrivate ? "Private domain" : "Domain unavailable"}
      </div>
      <div className="text-[#fb2c36]">{message}</div>
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
          otp={email.otp}
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
    return null
  }

  if (!detail) return null

  const senderName = detail.from.name ?? detail.from.email

  return (
    <div className="max-h-[min(70svh,680px)] overflow-y-auto border-t px-6 py-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-normal">
          {detail.subject}
        </h1>
        <EmailOtpChip otp={detail.otp} className="w-fit" />
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
        <div className="max-h-[min(52svh,520px)] min-h-60 overflow-y-auto border-y bg-background">
          {detail.bodyHtml ? (
            <iframe
              title={detail.subject}
              srcDoc={`<style>html,body{background:transparent!important;margin:0}</style>${detail.bodyHtml}`}
              sandbox="allow-same-origin"
              className="h-[520px] w-full bg-background"
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
