"use client"

import * as React from "react"
import {
  ArchiveXIcon,
  InboxIcon,
  Loader2Icon,
  PanelLeftIcon,
  PanelRightIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react"
import Link from "next/link"
import { useParams, usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"

import AddressSection from "@/components/sidebar/address-section"
import DomainSection from "@/components/sidebar/domain-section"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  buildInboxFolderHref,
  buildInboxHref,
  formatRelativeInboxTime,
  getInboxFolderFromPathname,
  mapInboxMessage,
  resolveActiveAddress,
} from "@/lib/inbox"
import { cn } from "@/lib/utils"
import { useAddressStore } from "@/stores/address.store"
import { useInboxStore } from "@/stores/inbox.store"
import type { EmailItem } from "@/types"

const navItems = [
  { title: "Inbox", folder: "inbox", url: "/inbox", icon: InboxIcon },
  { title: "Junk", folder: "junk", url: "/inbox/junk", icon: ArchiveXIcon },
  { title: "Trash", folder: "trash", url: "/inbox/trash", icon: Trash2Icon },
] as const

const INBOX_POLL_INTERVAL_MS = 5000

export function MobileInboxDrawerTrigger() {
  const [open, setOpen] = React.useState(false)
  const [emails, setEmails] = React.useState<EmailItem[]>([])
  const [search, setSearch] = React.useState("")
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const params = useParams<{ slug?: string[] }>()
  const pathname = usePathname()
  const router = useRouter()
  const addresses = useAddressStore((s) => s.addresses)
  const activeAddressId = useAddressStore((s) => s.activeAddressId)
  const setActiveAddress = useAddressStore((s) => s.setActiveAddress)
  const readIds = useInboxStore((s) => s.readIds)
  const trashedIds = useInboxStore((s) => s.trashedIds)
  const spamSenders = useInboxStore((s) => s.spamSenders)
  const emailsRef = React.useRef<EmailItem[]>([])

  const activeFolder = getInboxFolderFromPathname(pathname)
  const activeItem =
    navItems.find((item) => item.folder === activeFolder) ?? navItems[0]

  const activeAddress = resolveActiveAddress(addresses, params, activeAddressId)

  const fetchEmails = React.useCallback(
    async (address: string, silent = false) => {
      if (!activeAddress) return
      try {
        const res = await fetch(
          `/api/inbox?address=${encodeURIComponent(address)}`,
          { cache: "no-store" }
        )
        if (!res.ok) throw new Error("Gagal memuat email")
        const data = (await res.json()) as {
          messages: Array<{
            id: string
            from: string
            subject: string
            timestamp: number
          }>
        }
        const nextEmails = (data.messages ?? []).map((message) =>
          mapInboxMessage(message, activeAddress, readIds.has(message.id))
        )
        const nextIds = nextEmails.map((email) => email.id).join("|")
        const currentIds = emailsRef.current.map((email) => email.id).join("|")
        if (nextIds !== currentIds) {
          emailsRef.current = nextEmails
          setEmails(nextEmails)
        }
      } catch {
        if (!silent) toast.error("Gagal memuat email")
      }
    },
    [activeAddress, readIds]
  )

  React.useEffect(() => {
    if (open && activeAddress) {
      void fetchEmails(activeAddress.address)
    }
  }, [activeAddress?.id, activeItem.url, fetchEmails, open])

  React.useEffect(() => {
    emailsRef.current = emails
  }, [emails])

  React.useEffect(() => {
    if (!activeAddress) {
      emailsRef.current = []
      setEmails([])
      return
    }

    if (!open) {
      return
    }

    const address = activeAddress

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        void fetchEmails(address.address, true)
      }
    }, INBOX_POLL_INTERVAL_MS)

    function handleVisible() {
      if (document.visibilityState === "visible") {
        void fetchEmails(address.address, true)
      }
    }

    window.addEventListener("focus", handleVisible)
    document.addEventListener("visibilitychange", handleVisible)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener("focus", handleVisible)
      document.removeEventListener("visibilitychange", handleVisible)
    }
  }, [activeAddress, fetchEmails, open])

  async function refreshMails() {
    if (!activeAddress) return
    setIsRefreshing(true)
    await fetchEmails(activeAddress.address)
    setIsRefreshing(false)
  }

  const filtered = emails.filter((email) => {
    const isTrashed = trashedIds.has(email.id)
    const isSpam = spamSenders.has(email.from.email)
    if (activeItem.folder === "trash") return isTrashed
    if (activeItem.folder === "junk") return !isTrashed && isSpam
    if (isTrashed || isSpam) return false
    if (!search) return true
    const query = search.toLowerCase()
    return (
      email.subject.toLowerCase().includes(query) ||
      email.from.email.toLowerCase().includes(query) ||
      (email.from.name ?? "").toLowerCase().includes(query)
    )
  })

  return (
    <Drawer direction="bottom" open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="-ml-1 md:hidden"
          aria-label="Buka inbox"
        >
          <PanelLeftIcon />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-[78svh] w-full">
        <DrawerHeader>
          <DrawerTitle>Inbox</DrawerTitle>
          <DrawerDescription>Daftar folder dan email masuk.</DrawerDescription>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b p-3">
            <Input
              placeholder="Cari email..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Refresh inbox"
              onClick={() => void refreshMails()}
              disabled={isRefreshing}
            >
              <RefreshCwIcon className={cn(isRefreshing && "animate-spin")} />
            </Button>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col">
              {isRefreshing && emails.length === 0 ? (
                <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                  <Loader2Icon className="size-4 animate-spin" />
                  <span>Memuat inbox...</span>
                </div>
              ) : filtered.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  {activeAddress
                    ? "Belum ada email."
                    : "Pilih alamat untuk melihat inbox."}
                </p>
              ) : (
                filtered.map((email) => (
                  <Link
                    key={email.id}
                    href={`${email.addressId}/${email.id}`}
                    className="flex flex-col items-start gap-2 border-b p-4 text-left text-sm leading-tight last:border-b-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  >
                    <span className="flex w-full items-center gap-2">
                      <span className="truncate">
                        {email.from.name ?? email.from.email}
                      </span>
                      <span className="ml-auto shrink-0 text-xs">
                        {formatRelativeInboxTime(email.receivedAt)}
                      </span>
                    </span>
                    <span className="font-medium">{email.subject}</span>
                  </Link>
                ))
              )}
            </div>
          </ScrollArea>
          <nav className="flex shrink-0 flex-row items-center justify-center gap-2 border-t bg-popover p-3">
            {navItems.map((item) => (
              <Button
                key={item.title}
                type="button"
                variant={
                  activeItem.title === item.title ? "secondary" : "ghost"
                }
                size="icon-lg"
                className="flex-1"
                aria-label={item.title}
                onClick={() => {
                  if (activeAddress) {
                    const href =
                      item.folder === "inbox"
                        ? buildInboxHref(activeAddress)
                        : buildInboxFolderHref(activeAddress, item.folder)
                    setActiveAddress(activeAddress.id)
                    router.push(href)
                    return
                  }
                  router.push(item.url)
                }}
              >
                <item.icon />
                <span className="sr-only">{item.title}</span>
              </Button>
            ))}
          </nav>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export function MobileAddressDrawerTrigger() {
  return (
    <Drawer direction="bottom">
      <DrawerTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          aria-label="Buka address"
        >
          <PanelRightIcon />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-[78svh] w-full">
        <DrawerHeader>
          <DrawerTitle>Alamat Email</DrawerTitle>
          <DrawerDescription>
            Generate dan pindah disposable address.
          </DrawerDescription>
        </DrawerHeader>
        <Separator />
        <div className="min-h-0 flex-1">
          <ScrollArea className="h-full w-full">
            <DomainSection compact />
            <AddressSection compact />
          </ScrollArea>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
