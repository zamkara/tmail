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
import { Input } from "@/components/ui/input"
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

function randomLocalPart() {
  const chars = "abcdefghijklmnopqrstuvwxyz"
  return Array.from(
    { length: 7 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("")
}

function isValidLocalPart(value: string) {
  return /^[a-z0-9][a-z0-9._-]{0,63}$/.test(value)
}

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
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null)
  const [usernameMode, setUsernameMode] = useState<"random" | "manual">(
    "random"
  )
  const [localPart, setLocalPart] = useState("")
  const router = useRouter()

  useEffect(() => {
    removeExpired()
  }, [removeExpired])

  const sorted = [...addresses].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  const usableDomains = sortDomains(domains.filter(canGenerateFromDomain))
  const isGenerating = loadingDomainId !== null

  async function handleGenerateAddress(domain: Domain, nextLocalPart = "") {
    setLoadingDomainId(domain.id)

    try {
      const address = await generateAddress(
        domain.id,
        domain.name,
        Boolean(user),
        "",
        nextLocalPart
      )
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

  function resetCreateFlow(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setSelectedDomain(null)
      setUsernameMode("random")
      setLocalPart("")
      setLoadingDomainId(null)
    }
  }

  async function handleCreateSelectedDomain() {
    if (!selectedDomain || isGenerating) return

    const nextLocalPart = localPart.trim().toLowerCase()
    if (usernameMode === "manual" && !isValidLocalPart(nextLocalPart)) {
      toast.error(
        "Use 1-64 characters: lowercase letters, numbers, dots, dashes, or underscores."
      )
      return
    }

    await handleGenerateAddress(
      selectedDomain,
      usernameMode === "manual" ? nextLocalPart : ""
    )
    resetCreateFlow(false)
  }

  const previewLocalPart =
    usernameMode === "manual"
      ? localPart.trim().toLowerCase() || "username"
      : "random"

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
        onOpenChange={resetCreateFlow}
        title="Create email address"
        description="Choose a domain, then create a random or custom username."
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
                        onSelect={() => {
                          setSelectedDomain(domain)
                          if (usernameMode === "random" && !localPart) {
                            setLocalPart(randomLocalPart())
                          }
                        }}
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
          {selectedDomain ? (
            <div className="border-t p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{selectedDomain.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Preview: {previewLocalPart}@{selectedDomain.name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={usernameMode === "random" ? "default" : "outline"}
                    size="sm"
                    disabled={isGenerating}
                    onClick={() => {
                      setUsernameMode("random")
                      setLocalPart(randomLocalPart())
                    }}
                  >
                    Random
                  </Button>
                  <Button
                    type="button"
                    variant={usernameMode === "manual" ? "default" : "outline"}
                    size="sm"
                    disabled={isGenerating}
                    onClick={() => setUsernameMode("manual")}
                  >
                    Manual
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Input
                  value={localPart}
                  onChange={(event) =>
                    setLocalPart(event.target.value.toLowerCase())
                  }
                  placeholder="username"
                  disabled={isGenerating || usernameMode !== "manual"}
                />
                <span className="max-w-[42%] truncate text-sm text-muted-foreground">
                  @{selectedDomain.name}
                </span>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isGenerating}
                  onClick={() => setSelectedDomain(null)}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  disabled={
                    isGenerating ||
                    (usernameMode === "manual" && !localPart.trim())
                  }
                  onClick={() => void handleCreateSelectedDomain()}
                >
                  {isGenerating ? <Spinner data-icon="inline-start" /> : null}
                  Create
                </Button>
              </div>
            </div>
          ) : null}
        </Command>
      </CommandDialog>
    </SidebarGroup>
  )
}
