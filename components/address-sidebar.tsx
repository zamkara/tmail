"use client"

import * as React from "react"
import { AtSignIcon, PanelRightIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { toast } from "sonner"

import AddDomainDialog from "@/components/sidebar/add-domain-dialog"
import AddressSection from "@/components/sidebar/address-section"
import DomainSection from "@/components/sidebar/domain-section"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { getAddresses } from "@/services/address.service"
import { generateAddress } from "@/services/address.service"
import { getDomains } from "@/services/domain.service"
import { useAddressStore } from "@/stores/address.store"
import { useDomainStore } from "@/stores/domain.store"
import { useAuthStore } from "@/stores/auth.store"
import { useInboxStore } from "@/stores/inbox.store"
import type { Domain, GeneratedAddress } from "@/types"

interface AddressSidebarContextValue {
  open: boolean
  toggleOpen: () => void
}

const AddressSidebarContext =
  React.createContext<AddressSidebarContextValue | null>(null)

function useAddressSidebar() {
  const context = React.useContext(AddressSidebarContext)

  if (!context) {
    throw new Error(
      "useAddressSidebar must be used within AddressSidebarProvider."
    )
  }

  return context
}

export function AddressSidebarProvider({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [open, setOpen] = React.useState(true)

  const value = React.useMemo(
    () => ({
      open,
      toggleOpen: () => setOpen((current) => !current),
    }),
    [open]
  )

  return (
    <AddressSidebarContext.Provider value={value}>
      {children}
    </AddressSidebarContext.Provider>
  )
}

export function AddressSidebarTrigger({ className }: { className?: string }) {
  const { toggleOpen } = useAddressSidebar()

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={cn(className)}
      onClick={toggleOpen}
    >
      <PanelRightIcon />
      <span className="sr-only">Toggle address sidebar</span>
    </Button>
  )
}

export function AddressSidebar() {
  const { open } = useAddressSidebar()

  return (
    <div
      className="group/address-sidebar peer hidden text-sidebar-foreground md:block"
      data-state={open ? "expanded" : "collapsed"}
    >
      <div
        className={cn(
          "relative bg-transparent transition-[width] duration-200 ease-linear",
          open ? "w-[350px]" : "w-12"
        )}
      />
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-10 hidden h-svh border-l bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-linear md:flex",
          open ? "w-[350px]" : "w-12"
        )}
      >
        <div className="flex size-full min-w-0 flex-col">
          <SidebarHeader className="border-b">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" asChild>
                  <div>
                    <AtSignIcon />
                    <div
                      className={cn(
                        "grid flex-1 text-left text-sm leading-tight",
                        !open && "hidden"
                      )}
                    >
                      <span className="truncate font-medium">Alamat Email</span>
                      <span className="truncate text-xs text-muted-foreground">
                        Generate dan pindah address
                      </span>
                    </div>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent className="overflow-hidden">
            {open ? (
              <div>
                <DomainSection compact />
                <AddressSection compact />
              </div>
            ) : (
              <CollapsedAddressRail />
            )}
          </SidebarContent>
          <SidebarFooter className={cn(!open && "hidden")}>
            <p className="px-2 text-xs text-muted-foreground">
              Kamu bisa memakai beberapa address sekaligus.
            </p>
          </SidebarFooter>
        </div>
      </aside>
    </div>
  )
}

function CollapsedAddressRail() {
  const pathname = usePathname()
  const domains = useDomainStore((state) => state.domains)
  const domainsLoaded = useDomainStore((state) => state.isLoaded)
  const setDomains = useDomainStore((state) => state.setDomains)
  const addresses = useAddressStore((state) => state.addresses)
  const addressesLoaded = useAddressStore((state) => state.isLoaded)
  const setAddresses = useAddressStore((state) => state.setAddresses)
  const setActiveAddress = useAddressStore((state) => state.setActiveAddress)
  const activeAddressId = useAddressStore((state) => state.activeAddressId)

  React.useEffect(() => {
    if (domainsLoaded) {
      return
    }

    async function loadDomains() {
      try {
        setDomains(await getDomains())
      } catch {
        toast.error("Gagal memuat daftar domain")
      }
    }

    void loadDomains()
  }, [domainsLoaded, setDomains])

  React.useEffect(() => {
    if (addressesLoaded) {
      return
    }

    async function loadAddresses() {
      try {
        setAddresses(await getAddresses())
      } catch {
        toast.error("Gagal memuat alamat aktif")
      }
    }

    void loadAddresses()
  }, [addressesLoaded, setAddresses])

  const sortedAddresses = [...addresses].sort(
    (first, second) =>
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
  )

  const FOLDER_PATHS = ["/inbox/junk", "/inbox/trash"]
  const activeFolder = FOLDER_PATHS.find((f) => pathname.startsWith(f)) ?? "/inbox"

  return (
    <div className="flex min-w-0 flex-col items-center gap-2 p-2">
      <div className="flex flex-col items-center gap-1">
        {domains.map((domain) => (
          <Tooltip key={domain.id}>
            <TooltipTrigger asChild>
              <CollapsedDomainButton domain={domain} />
            </TooltipTrigger>
            <TooltipContent side="left">{domain.name}</TooltipContent>
          </Tooltip>
        ))}
      </div>
      <AddDomainDialog iconOnly />
      <Separator />
      <div className="flex flex-col items-center gap-1">
        {sortedAddresses.map((address) => {
          const isActive = activeAddressId === address.id
          const href = buildInboxHref(address, activeFolder)

          return (
            <Tooltip key={address.id}>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant="ghost"
                  size="icon-sm"
                  className={cn(isActive && "bg-sidebar-accent")}
                >
                  <Link
                    href={href}
                    onClick={() => setActiveAddress(address.id)}
                  >
                    <Avatar size="sm">
                      <AvatarFallback>
                        {getAddressInitials(address.address)}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">{address.address}</TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </div>
  )
}

function buildInboxHref(address: GeneratedAddress, folder: string) {
  const base = address.username
    ? `/inbox/${address.username}/${address.domainName}`
    : `/inbox/${address.id}`
  return folder === "/inbox" ? base : `${base}/${folder.replace("/inbox/", "")}`
}

function CollapsedDomainButton({ domain }: { domain: Domain }) {
  const [isLoading, setIsLoading] = React.useState(false)
  const addAddress = useAddressStore((state) => state.addAddress)
  const user = useAuthStore((s) => s.user)
  const resetInbox = useInboxStore((s) => s.resetInbox)

  async function handleGenerate() {
    setIsLoading(true)

    try {
      const address = await generateAddress(domain.id, domain.name, !!user)
      resetInbox()
      addAddress(address)
      toast.success("Alamat email dibuat")
    } catch {
      toast.error("Gagal membuat alamat email")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={`Buat alamat dari ${domain.name}`}
      disabled={isLoading}
      onClick={() => void handleGenerate()}
    >
      {isLoading ? (
        <Spinner />
      ) : (
        <Avatar size="sm">
          <AvatarFallback>{getDomainInitials(domain.name)}</AvatarFallback>
        </Avatar>
      )}
    </Button>
  )
}

function getAddressInitials(address: string) {
  return address.split("@")[0]?.slice(0, 2).toUpperCase() ?? "??"
}

function getDomainInitials(name: string) {
  return name
    .split(".")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.slice(0, 1))
    .join("")
    .toUpperCase()
}
