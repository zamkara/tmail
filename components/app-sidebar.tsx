"use client"

import * as React from "react"
import {
  ArchiveXIcon,
  InboxIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useParams, usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"

import EmailContextMenu from "@/components/inbox/email-context-menu"
import EmailOtpChip from "@/components/inbox/email-otp-chip"
import { NavUser } from "@/components/nav-user"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Switch } from "@/components/ui/switch"
import {
  buildInboxFolderHref,
  buildInboxHref,
  formatRelativeInboxTime,
  getInboxFolderFromPathname,
  mapInboxMessage,
  resolveActiveAddress,
} from "@/lib/inbox"
import { useAddressStore } from "@/stores/address.store"
import { useInboxStore } from "@/stores/inbox.store"
import type { EmailItem, GeneratedAddress } from "@/types"

const navMain = [
  { title: "Inbox", folder: "inbox", url: "/inbox", icon: <InboxIcon /> },
  { title: "Junk", folder: "junk", url: "/inbox/junk", icon: <ArchiveXIcon /> },
  {
    title: "Trash",
    folder: "trash",
    url: "/inbox/trash",
    icon: <Trash2Icon />,
  },
] as const

const INBOX_FALLBACK_POLL_INTERVAL_MS = 5000
const INBOX_WEBSOCKET_POLL_INTERVAL_MS = 60000

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [emails, setEmails] = React.useState<EmailItem[]>([])
  const [unreadOnly, setUnreadOnly] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [isAutoRefreshing, setIsAutoRefreshing] = React.useState(false)
  const [isDeletingMessages, setIsDeletingMessages] = React.useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)
  const [isBackendWebSocketConnected, setIsBackendWebSocketConnected] =
    React.useState(false)
  const params = useParams<{ slug?: string[] }>()
  const pathname = usePathname()
  const router = useRouter()
  const addresses = useAddressStore((s) => s.addresses)
  const activeAddressId = useAddressStore((s) => s.activeAddressId)
  const readIds = useInboxStore((s) => s.readIds)
  const trashedIds = useInboxStore((s) => s.trashedIds)
  const permanentlyDeletedIds = useInboxStore((s) => s.permanentlyDeletedIds)
  const spamSenders = useInboxStore((s) => s.spamSenders)
  const emailsRef = React.useRef<EmailItem[]>([])

  const activeFolder = getInboxFolderFromPathname(pathname)
  const activeItem =
    navMain.find((item) => item.folder === activeFolder) ?? navMain[0]

  const activeAddress = resolveActiveAddress(addresses, params, activeAddressId)
  const activeAddressEmail = activeAddress?.address ?? null

  const fetchEmails = React.useCallback(
    async (address: string, addr: GeneratedAddress, silent = false) => {
      try {
        const res = await fetch(
          `/api/inbox?address=${encodeURIComponent(address)}`,
          {
            cache: "no-store",
          }
        )
        if (!res.ok) throw new Error("Failed to load emails")
        const data = (await res.json()) as {
          messages: Array<{
            id: string
            from: string
            subject: string
            timestamp: number
            text?: string
            otp?: string | null
          }>
        }
        const nextEmails = (data.messages ?? []).map((m) =>
          mapInboxMessage(m, addr, readIds.has(m.id))
        )
        const nextIds = nextEmails.map((email) => email.id).join("|")
        const currentIds = emailsRef.current.map((email) => email.id).join("|")
        if (nextIds !== currentIds) {
          emailsRef.current = nextEmails
          setEmails(nextEmails)
        }
      } catch {
        if (!silent) toast.error("Failed to load emails")
      }
    },
    [readIds]
  )

  const refreshActiveAddress = React.useCallback(
    async (silent = false) => {
      if (!activeAddress) return
      if (silent) {
        setIsAutoRefreshing(true)
      }

      try {
        await fetchEmails(activeAddress.address, activeAddress, silent)
      } finally {
        if (silent) {
          setIsAutoRefreshing(false)
        }
      }
    },
    [activeAddress, fetchEmails]
  )

  React.useEffect(() => {
    emailsRef.current = emails
  }, [emails])

  React.useEffect(() => {
    if (!activeAddress) {
      emailsRef.current = []
      setEmails([])
      setIsBackendWebSocketConnected(false)
      return
    }

    if (document.visibilityState === "visible" && navigator.onLine) {
      void refreshActiveAddress()
    }

    const pollInterval = isBackendWebSocketConnected
      ? INBOX_WEBSOCKET_POLL_INTERVAL_MS
      : INBOX_FALLBACK_POLL_INTERVAL_MS

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        void refreshActiveAddress(true)
      }
    }, pollInterval)

    function handleVisible() {
      if (document.visibilityState === "visible" && navigator.onLine) {
        void refreshActiveAddress(true)
      }
    }

    function handleBackendUpdate(event: Event) {
      const customEvent = event as CustomEvent<{
        email?: string | null
        message?: {
          id: string
          from: string
          subject: string
          timestamp: number
          text?: string
          otp?: string | null
        } | null
      }>
      if (customEvent.detail.email && customEvent.detail.email !== activeAddressEmail) {
        return
      }

      if (activeAddress && customEvent.detail.message?.id) {
        const nextEmail = mapInboxMessage(
          customEvent.detail.message,
          activeAddress,
          readIds.has(customEvent.detail.message.id)
        )
        emailsRef.current = [
          nextEmail,
          ...emailsRef.current.filter((email) => email.id !== nextEmail.id),
        ]
        setEmails(emailsRef.current)
        return
      }

      void refreshActiveAddress(true)
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

    window.addEventListener("focus", handleVisible)
    document.addEventListener("visibilitychange", handleVisible)
    window.addEventListener("tmail:backend-inbox-update", handleBackendUpdate)
    window.addEventListener(
      "tmail:backend-ws-status",
      handleBackendWebSocketStatus
    )

    return () => {
      window.clearInterval(interval)
      window.removeEventListener("focus", handleVisible)
      document.removeEventListener("visibilitychange", handleVisible)
      window.removeEventListener("tmail:backend-inbox-update", handleBackendUpdate)
      window.removeEventListener(
        "tmail:backend-ws-status",
        handleBackendWebSocketStatus
      )
    }
  }, [
    activeAddress,
    activeAddressEmail,
    isBackendWebSocketConnected,
    readIds,
    refreshActiveAddress,
  ])

  async function handleRefresh() {
    if (!activeAddress) return
    setIsRefreshing(true)
    await fetchEmails(activeAddress.address, activeAddress)
    setIsRefreshing(false)
  }

  async function handleDeleteAllMessages() {
    if (!activeAddress || isDeletingMessages) return

    setIsDeletingMessages(true)

    try {
      const res = await fetch(
        `/api/inbox?address=${encodeURIComponent(activeAddress.address)}`,
        { method: "DELETE", cache: "no-store" }
      )
      const data = (await res.json().catch(() => null)) as {
        error?: string
        messages_deleted?: number
      } | null

      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to delete messages")
      }

      emailsRef.current = []
      setEmails([])
      setDeleteConfirmOpen(false)
      toast.success(`Deleted ${data?.messages_deleted ?? 0} messages`)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete messages"
      )
    } finally {
      setIsDeletingMessages(false)
    }
  }

  const filtered = emails.filter((e) => {
    const isTrashed = trashedIds.has(e.id)
    const isPermanentlyDeleted = permanentlyDeletedIds.has(e.id)
    const isSpam = spamSenders.has(e.from.email)
    if (activeItem.folder === "trash") return isTrashed && !isPermanentlyDeleted
    if (activeItem.folder === "junk") return !isTrashed && isSpam
    if (isTrashed || isSpam) return false
    const isRead = readIds.has(e.id)
    if (unreadOnly && isRead) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        e.subject.toLowerCase().includes(q) ||
        e.from.email.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
      {...props}
    >
      {/* Icon rail */}
      <Sidebar
        collapsible="none"
        className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
                <Link href="/">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <Image
                      src="/ic_tmail.svg"
                      alt="tmail"
                      width={24}
                      height={24}
                      className="size-6 object-contain"
                    />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">tmail</span>
                    <span className="truncate text-xs">Disposable email</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {navMain.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={{ children: item.title, hidden: false }}
                      isActive={activeItem?.title === item.title}
                      className="px-2.5 md:px-2"
                      onClick={() => {
                        if (activeAddress) {
                          const folder =
                            item.folder === "inbox"
                              ? buildInboxHref(activeAddress)
                              : buildInboxFolderHref(activeAddress, item.folder)
                          router.push(folder)
                        } else {
                          router.push(item.url)
                        }
                      }}
                    >
                      {item.icon}
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <NavUser />
        </SidebarFooter>
      </Sidebar>

      {/* Second panel — email list */}
      <Sidebar
        collapsible="none"
        className="hidden h-full flex-1 overflow-hidden md:flex"
      >
        <SidebarHeader className="gap-3.5 border-b p-4">
          <div className="flex w-full items-center justify-between">
            <div className="text-base font-medium text-foreground">
              {activeItem?.title}
            </div>
            <Label className="flex items-center gap-2 text-sm">
              <span>Unreads</span>
              <Switch
                className="shadow-none"
                checked={unreadOnly}
                onCheckedChange={setUnreadOnly}
              />
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <SidebarInput
              placeholder="Search emails..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Refresh inbox"
              onClick={() => void handleRefresh()}
              disabled={isRefreshing || isDeletingMessages}
            >
              <RefreshCwIcon className={isRefreshing || isAutoRefreshing ? "animate-spin" : ""} />
            </Button>
            <Button
              type="button"
              variant="default"
              size="icon-sm"
              aria-label="Delete all messages"
              disabled={
                !activeAddress ||
                filtered.length === 0 ||
                isRefreshing ||
                isDeletingMessages
              }
              onClick={() => setDeleteConfirmOpen(true)}
              className="bg-[#fb2c36] text-white hover:bg-[#fb2c36]/90 disabled:bg-[#fb2c36] disabled:text-white disabled:opacity-60"
            >
              {isDeletingMessages ? (
                <RefreshCwIcon className="animate-spin" />
              ) : (
                <Trash2Icon />
              )}
            </Button>
          </div>
          <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
            <DialogContent className="border-border bg-card text-card-foreground sm:max-w-sm">
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
                  variant="default"
                  disabled={isDeletingMessages}
                  onClick={() => void handleDeleteAllMessages()}
                  className="bg-[#fb2c36] text-white hover:bg-[#fb2c36]/90 disabled:bg-[#fb2c36] disabled:text-white disabled:opacity-60"
                >
                  {isDeletingMessages ? <RefreshCwIcon className="animate-spin" /> : null}
                  Delete messages
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="px-0">
            <SidebarGroupContent>
              {filtered.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  {activeItem.folder !== "inbox"
                    ? `${activeItem.title} folder is empty.`
                    : activeAddress
                      ? "No emails yet."
                      : "Select an address to view inbox."}
                </p>
              ) : (
                filtered.map((email) => {
                  const addressPath = email.addressId.replace("/inbox/", "")
                  const emailHref = activeFolder !== "inbox"
                    ? `/inbox/${activeFolder}/${addressPath}/${email.id}`
                    : `${email.addressId}/${email.id}`

                  return (
                  <EmailContextMenu key={email.id} email={email}>
                    <div
                      role="link"
                      tabIndex={0}
                      className="flex min-w-0 cursor-pointer flex-col items-start gap-2 overflow-hidden border-b p-4 text-sm leading-tight last:border-b-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => router.push(emailHref)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          router.push(emailHref)
                        }
                      }}
                    >
                      <div className="flex w-full min-w-0 items-center gap-2">
                        {!email.isRead && (
                          <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden />
                        )}
                        <span className="min-w-0 truncate">
                          {email.from.name ?? email.from.email}
                        </span>
                        <span className="ml-auto shrink-0 text-xs">
                          {formatRelativeInboxTime(email.receivedAt)}
                        </span>
                      </div>
                      <span className="flex w-full min-w-0 items-center gap-2">
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {email.subject}
                        </span>
                        <EmailOtpChip
                          otp={email.otp}
                          className="shrink-0"
                        />
                      </span>
                    </div>
                  </EmailContextMenu>
                )
              }))}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </Sidebar>
  )
}
