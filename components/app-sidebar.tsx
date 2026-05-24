"use client"

import * as React from "react"
import {
  ArchiveXIcon,
  InboxIcon,
  RefreshCwIcon,
  TerminalIcon,
  Trash2Icon,
} from "lucide-react"
import Link from "next/link"
import { useParams, usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"

import { NavUser } from "@/components/nav-user"
import EmailContextMenu from "@/components/inbox/email-context-menu"
import { Button } from "@/components/ui/button"
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

const INBOX_POLL_INTERVAL_MS = 5000

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [emails, setEmails] = React.useState<EmailItem[]>([])
  const [unreadOnly, setUnreadOnly] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [isAutoRefreshing, setIsAutoRefreshing] = React.useState(false)
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
      return
    }

    void refreshActiveAddress()

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        void refreshActiveAddress(true)
      }
    }, INBOX_POLL_INTERVAL_MS)

    function handleVisible() {
      if (document.visibilityState === "visible") {
        void refreshActiveAddress(true)
      }
    }

    function handleBackendUpdate(event: Event) {
      const customEvent = event as CustomEvent<{
        email?: string | null
      }>
      if (customEvent.detail.email && customEvent.detail.email !== activeAddressEmail) {
        return
      }
      void refreshActiveAddress(true)
    }

    window.addEventListener("focus", handleVisible)
    document.addEventListener("visibilitychange", handleVisible)
    window.addEventListener("tmail:backend-inbox-update", handleBackendUpdate)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener("focus", handleVisible)
      document.removeEventListener("visibilitychange", handleVisible)
      window.removeEventListener("tmail:backend-inbox-update", handleBackendUpdate)
    }
  }, [activeAddress, activeAddressEmail, refreshActiveAddress])

  async function handleRefresh() {
    if (!activeAddress) return
    setIsRefreshing(true)
    await fetchEmails(activeAddress.address, activeAddress)
    setIsRefreshing(false)
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
                <a href="#">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <TerminalIcon className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">tmail</span>
                    <span className="truncate text-xs">Disposable email</span>
                  </div>
                </a>
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
              disabled={isRefreshing}
            >
              <RefreshCwIcon className={isRefreshing || isAutoRefreshing ? "animate-spin" : ""} />
            </Button>
          </div>
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
                    <Link
                      href={emailHref}
                      className="flex min-w-0 flex-col items-start gap-2 overflow-hidden border-b p-4 text-sm leading-tight last:border-b-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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
                      <span className="w-full truncate font-medium">
                        {email.subject}
                      </span>
                    </Link>
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
