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
import { useAddressStore } from "@/stores/address.store"
import { useInboxStore } from "@/stores/inbox.store"
import type { EmailItem } from "@/types"

const navMain = [
  { title: "Inbox", url: "/inbox", icon: <InboxIcon /> },
  { title: "Junk", url: "/inbox/junk", icon: <ArchiveXIcon /> },
  { title: "Trash", url: "/inbox/trash", icon: <Trash2Icon /> },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [emails, setEmails] = React.useState<EmailItem[]>([])
  const [unreadOnly, setUnreadOnly] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const params = useParams<{ addressId?: string }>()
  const pathname = usePathname()
  const router = useRouter()
  const addresses = useAddressStore((s) => s.addresses)
  const activeAddressId = useAddressStore((s) => s.activeAddressId)
  const readIds = useInboxStore((s) => s.readIds)
  const trashedIds = useInboxStore((s) => s.trashedIds)
  const spamSenders = useInboxStore((s) => s.spamSenders)

  const activeItem =
    navMain
      .slice()
      .sort((a, b) => b.url.length - a.url.length)
      .find((item) => pathname === item.url || pathname.startsWith(item.url + "/")) ?? navMain[0]

  const isInboxFolder = activeItem.url === "/inbox"

  const activeAddress = addresses.find((a) => a.id === (params.addressId ?? activeAddressId))

  async function fetchEmails(address: string, addressId: string) {
    try {
      const res = await fetch(`/api/inbox?address=${encodeURIComponent(address)}`)
      const data = await res.json() as { messages: Array<{ id: string; from: string; subject: string; timestamp: number }> }
      setEmails(
        (data.messages ?? []).map((m) => ({
          id: m.id,
          addressId,
          from: parseFrom(m.from),
          subject: m.subject || "(tanpa subjek)",
          receivedAt: new Date(m.timestamp).toISOString(),
          isRead: readIds.has(m.id),
          snippet: "",
        }))
      )
    } catch {
      toast.error("Gagal memuat email")
    }
  }

  React.useEffect(() => {
    if ((isInboxFolder || activeItem.url === "/inbox/junk" || activeItem.url === "/inbox/trash") && activeAddress) {
      void fetchEmails(activeAddress.address, activeAddress.id)
    } else {
      setEmails([])
    }
  }, [activeAddress?.id, activeItem.url])

  async function handleRefresh() {
    if (!activeAddress) return
    setIsRefreshing(true)
    await fetchEmails(activeAddress.address, activeAddress.id)
    setIsRefreshing(false)
  }

  const filtered = emails.filter((e) => {
    const isTrashed = trashedIds.has(e.id)
    const isSpam = spamSenders.has(e.from.email)
    if (activeItem.url === "/inbox/trash") return isTrashed
    if (activeItem.url === "/inbox/junk") return !isTrashed && isSpam
    if (isTrashed || isSpam) return false
    const isRead = readIds.has(e.id)
    if (unreadOnly && isRead) return false
    if (search) {
      const q = search.toLowerCase()
      return e.subject.toLowerCase().includes(q) || e.from.email.toLowerCase().includes(q)
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
                      onClick={() => router.push(item.url)}
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
      <Sidebar collapsible="none" className="hidden h-full flex-1 overflow-hidden md:flex">
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
              placeholder="Cari email..."
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
              <RefreshCwIcon className={isRefreshing ? "animate-spin" : ""} />
            </Button>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="px-0">
            <SidebarGroupContent>
              {filtered.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  {!isInboxFolder && activeItem.url !== "/inbox/trash"
                    ? `Folder ${activeItem.title} kosong.`
                    : activeAddress
                      ? "Belum ada email."
                      : "Pilih alamat untuk melihat inbox."}
                </p>
              ) : (
                filtered.map((email) => (
                  <EmailContextMenu key={email.id} email={email}>
                    <Link
                      href={`/inbox/${email.addressId}/${email.id}`}
                      className="flex min-w-0 flex-col items-start gap-2 overflow-hidden border-b p-4 text-sm leading-tight last:border-b-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    >
                      <div className="flex w-full min-w-0 items-center gap-2">
                        <span className="min-w-0 truncate">{email.from.name ?? email.from.email}</span>
                        <span className="ml-auto shrink-0 text-xs">{formatRelative(email.receivedAt)}</span>
                    </div>
                    <span className="w-full truncate font-medium">{email.subject}</span>
                  </Link>
                  </EmailContextMenu>
                ))
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </Sidebar>
  )
}

function parseFrom(from: string) {
  const match = from.match(/^(.+?)\s*<(.+?)>$/)
  if (match) return { name: match[1].trim(), email: match[2].trim() }
  return { name: null, email: from.trim() }
}

function formatRelative(value: string) {
  const diff = Date.now() - new Date(value).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1) return "Baru saja"
  if (m < 60) return `${m}m lalu`
  if (h < 24) return `${h}j lalu`
  return `${d}h lalu`
}