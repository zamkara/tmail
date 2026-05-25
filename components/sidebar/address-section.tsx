"use client"

import { useEffect, useState } from "react"
import { GlobeIcon, PlusIcon, SearchIcon, ShuffleIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import AddressCard from "@/components/sidebar/address-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner"
import { buildInboxHref } from "@/lib/inbox"
import { generateAddress } from "@/services/address.service"
import { useAddressStore } from "@/stores/address.store"
import { useAuthStore } from "@/stores/auth.store"
import { useDomainStore } from "@/stores/domain.store"
import { useInboxStore } from "@/stores/inbox.store"
import { Command as CommandPrimitive } from "cmdk"
import type { Domain } from "@/types"

function sortDomains(domains: Domain[]) {
  return [...domains].sort((first, second) => {
    const firstOwned = first.isOwnedByUser ? 0 : 1
    const secondOwned = second.isOwnedByUser ? 0 : 1

    if (firstOwned !== secondOwned) return firstOwned - secondOwned
    return first.name.localeCompare(second.name)
  })
}

function canGenerateFromDomain(domain: Domain) {
  if (!domain.isVerified || domain.isBanned) return false
  if (domain.visibility !== "private") return true

  return Boolean(domain.isOwnedByUser)
}

export default function AddressSection({ compact = false }: { compact?: boolean }) {
  const addresses = useAddressStore((s) => s.addresses)
  const addAddress = useAddressStore((s) => s.addAddress)
  const setActiveAddress = useAddressStore((s) => s.setActiveAddress)
  const removeExpired = useAddressStore((s) => s.removeExpired)
  const domains = useDomainStore((s) => s.domains)
  const user = useAuthStore((s) => s.user)
  const resetInbox = useInboxStore((s) => s.resetInbox)
  const [open, setOpen] = useState(false)
  const [loadingDomainId, setLoadingDomainId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    removeExpired()
  }, [removeExpired])

  const sorted = [...addresses].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  const usableDomains = sortDomains(domains.filter(canGenerateFromDomain))
  const isGenerating = loadingDomainId !== null

  async function handleGenerateAddress(domain: Domain) {
    setLoadingDomainId(domain.id)

    try {
      const address = await generateAddress(domain.id, domain.name, Boolean(user))
      resetInbox()
      addAddress(address)
      setActiveAddress(address.id)
      router.push(buildInboxHref(address))
      toast.success("Email address created")
      setOpen(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create email address"
      )
    } finally {
      setLoadingDomainId(null)
    }
  }

  async function handleGenerateRandomAddress() {
    if (usableDomains.length === 0 || isGenerating) return

    const domain =
      usableDomains[Math.floor(Math.random() * usableDomains.length)]
    await handleGenerateAddress(domain)
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="justify-between gap-2">
        <span>Alamat Aktif</span>
        <span className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            aria-label="Create random email address"
            disabled={isGenerating || usableDomains.length === 0}
            onClick={() => void handleGenerateRandomAddress()}
          >
            {isGenerating ? (
              <Spinner className="size-3.5" />
            ) : (
              <ShuffleIcon className="size-3.5" />
            )}
            Random
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            aria-label="Create email address"
            disabled={isGenerating || usableDomains.length === 0}
            onClick={() => setOpen(true)}
          >
            <PlusIcon className="size-3.5" />
            New
          </Button>
        </span>
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {sorted.map((address) => (
            <AddressCard key={address.id} address={address} compact={compact} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Create email address"
        description="Choose a domain for the new email address."
        className="sm:max-w-md"
      >
        <Command>
          <div className="p-1 pb-0">
            <InputGroup className="h-8! rounded-lg! border-input/30 bg-input/30 shadow-none! *:data-[slot=input-group-addon]:pl-2!">
              <CommandPrimitive.Input
                data-slot="command-input"
                className="w-full text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Search domain..."
              />
              <InputGroupAddon>
                <SearchIcon className="shrink-0 opacity-50" />
              </InputGroupAddon>
            </InputGroup>
          </div>
          <CommandList>
            {usableDomains.length === 0 ? (
              <CommandEmpty>No domains available.</CommandEmpty>
            ) : (
              <>
                <CommandEmpty>No domains found.</CommandEmpty>
                <CommandGroup heading="Domains">
                  {usableDomains.map((domain) => {
                    const isLoading = loadingDomainId === domain.id

                    return (
                      <CommandItem
                        key={domain.id}
                        value={domain.name}
                        disabled={isGenerating}
                        onSelect={() => void handleGenerateAddress(domain)}
                      >
                        {isLoading ? <Spinner /> : <GlobeIcon />}
                        <span className="min-w-0 flex-1 truncate">
                          {domain.name}
                        </span>
                        {domain.isOwnedByUser ? (
                          <Badge variant="outline">Owned</Badge>
                        ) : (
                          <Badge variant="secondary">Public</Badge>
                        )}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </SidebarGroup>
  )
}
