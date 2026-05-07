"use client"

import { useEffect, useState } from "react"
import { Building2Icon, GlobeIcon, SparklesIcon } from "lucide-react"
import { toast } from "sonner"

import DomainBadge from "@/components/shared/domain-badge"
import AddDomainDialog from "@/components/sidebar/add-domain-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner"
import { generateAddress } from "@/services/address.service"
import { getDomains } from "@/services/domain.service"
import { useAddressStore } from "@/stores/address.store"
import { useDomainStore } from "@/stores/domain.store"
import { useAuthStore } from "@/stores/auth.store"
import { useInboxStore } from "@/stores/inbox.store"
import { cn } from "@/lib/utils"

interface DomainSectionProps {
  compact?: boolean
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

export default function DomainSection({ compact = false }: DomainSectionProps) {
  const domains = useDomainStore((state) => state.domains)
  const isLoaded = useDomainStore((state) => state.isLoaded)
  const setDomains = useDomainStore((state) => state.setDomains)
  const addAddress = useAddressStore((state) => state.addAddress)
  const [loadingDomainId, setLoadingDomainId] = useState<string | null>(null)
  const user = useAuthStore((s) => s.user)
  const resetInbox = useInboxStore((s) => s.resetInbox)

  useEffect(() => {
    if (isLoaded) {
      return
    }

    async function loadDomains() {
      try {
        const nextDomains = await getDomains()
        setDomains(nextDomains)
      } catch {
        toast.error("Gagal memuat daftar domain")
      }
    }

    void loadDomains()
  }, [isLoaded, setDomains])

  const sortedDomains = [...domains].sort((first, second) => {
    if (first.type !== second.type) {
      return first.type === "system" ? -1 : 1
    }

    return first.name.localeCompare(second.name)
  })

  async function handleDomainClick(domainId: string, domainName: string) {
    setLoadingDomainId(domainId)

    try {
      const address = await generateAddress(domainId, domainName, !!user)
      resetInbox()
      addAddress(address)
      toast.success("Alamat email dibuat")
    } catch {
      toast.error("Gagal membuat alamat email")
    } finally {
      setLoadingDomainId(null)
    }
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Domains</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {sortedDomains.map((domain) => {
            const Icon = domain.type === "system" ? GlobeIcon : Building2Icon
            const isLoading = loadingDomainId === domain.id

            return (
              <SidebarMenuItem key={domain.id}>
                <SidebarMenuButton
                  onClick={() => void handleDomainClick(domain.id, domain.name)}
                  className={cn(compact && "h-9")}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {compact ? (
                      <Avatar size="sm">
                        <AvatarFallback>
                          {getDomainInitials(domain.name)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <Icon />
                    )}
                    <span className="min-w-0 flex-1 truncate">
                      {domain.name}
                    </span>
                    {!compact && <DomainBadge type={domain.type} />}
                    {compact ? (
                      isLoading ? (
                        <Spinner />
                      ) : (
                        <SparklesIcon />
                      )
                    ) : isLoading ? (
                      <Spinner />
                    ) : (
                      <SparklesIcon />
                    )}
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
        <div className="mt-2">
          <AddDomainDialog />
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
