"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  GlobeIcon,
  LogIn,
  MailIcon,
  Plus,
  RefreshCwIcon,
  SearchIcon,
} from "lucide-react"
import { Command as CommandPrimitive } from "cmdk"
import { toast } from "sonner"

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
import { Spinner } from "@/components/ui/spinner"
import { generateAddress } from "@/services/address.service"
import { getDomains } from "@/services/domain.service"
import { useAddressStore } from "@/stores/address.store"
import { useAuthStore } from "@/stores/auth.store"
import { useDomainStore } from "@/stores/domain.store"
import { useInboxStore } from "@/stores/inbox.store"
import type { Domain, GeneratedAddress } from "@/types"

function isAddressAvailable(address: GeneratedAddress) {
  return new Date(address.expiresAt).getTime() > Date.now()
}

function sortDomains(domains: Domain[]) {
  return [...domains].sort((first, second) =>
    first.name.localeCompare(second.name)
  )
}

function getGuestDomains(domains: Domain[]) {
  return domains.filter((domain) => domain.type === "system")
}

function findReusableAddress(addresses: GeneratedAddress[], domainId: string) {
  return addresses.find(
    (address) => address.domainId === domainId && isAddressAvailable(address)
  )
}

interface DomainAddressSwitcherProps {
  hideGenerate?: boolean
}

export default function DomainAddressSwitcher({
  hideGenerate,
}: DomainAddressSwitcherProps) {
  const [open, setOpen] = useState(false)
  const [isLoadingDomains, setIsLoadingDomains] = useState(true)
  const [loadingDomainId, setLoadingDomainId] = useState<string | null>(null)
  const [showLogin, setShowLogin] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setShowLogin((prev) => !prev)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const domains = useDomainStore((state) => state.domains)
  const setDomains = useDomainStore((state) => state.setDomains)

  const addresses = useAddressStore((state) => state.addresses)
  const activeAddressId = useAddressStore((state) => state.activeAddressId)
  const addAddress = useAddressStore((state) => state.addAddress)
  const setActiveAddress = useAddressStore((state) => state.setActiveAddress)
  const removeExpired = useAddressStore((state) => state.removeExpired)

  const user = useAuthStore((state) => state.user)
  const resetInbox = useInboxStore((state) => state.resetInbox)

  useEffect(() => {
    removeExpired()
  }, [removeExpired])

  useEffect(() => {
    let cancelled = false

    async function loadDomains() {
      setIsLoadingDomains(true)
      try {
        const nextDomains = await getDomains()
        const systemDomains = getGuestDomains(nextDomains)

        if (!cancelled) {
          if (systemDomains.length === 0) {
            console.warn("No system domains returned from API")
            toast.error("Failed to load domains from server")
          }
          setDomains(systemDomains)
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load domains:", error)
          toast.error(
            error instanceof Error ? error.message : "Failed to load domains"
          )
          setDomains([])
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDomains(false)
        }
      }
    }

    void loadDomains()

    return () => {
      cancelled = true
    }
  }, [setDomains])

  const sortedDomains = useMemo(
    () => sortDomains(getGuestDomains(domains)),
    [domains]
  )
  const activeAddress = useMemo(
    () =>
      addresses.find(
        (address) =>
          address.id === activeAddressId && isAddressAvailable(address)
      ) ?? null,
    [activeAddressId, addresses]
  )

  async function handleSelectDomain(domain: Domain) {
    const reusableAddress = findReusableAddress(addresses, domain.id)

    if (reusableAddress) {
      setActiveAddress(reusableAddress.id)
      setOpen(false)
      return
    }

    setLoadingDomainId(domain.id)

    try {
      const address = await generateAddress(
        domain.id,
        domain.name,
        Boolean(user)
      )
      resetInbox()
      addAddress(address)
      setActiveAddress(address.id)
      toast.success("Email address created")
      setOpen(false)
    } catch {
      toast.error("Failed to create email address")
    } finally {
      setLoadingDomainId(null)
    }
  }

  async function handleGenerateRandomAddress() {
    const randomDomain =
      sortedDomains[Math.floor(Math.random() * sortedDomains.length)]

    if (!randomDomain) {
      toast.error("No domains available")
      return
    }

    setLoadingDomainId(randomDomain.id)

    try {
      const address = await generateAddress(
        randomDomain.id,
        randomDomain.name,
        Boolean(user)
      )
      resetInbox()
      addAddress(address)
      setActiveAddress(address.id)
      toast.success("Email address created")
    } catch {
      toast.error("Failed to create email address")
    } finally {
      setLoadingDomainId(null)
    }
  }

  const isSelectingDomain = loadingDomainId !== null
  const activeDomainId = activeAddress?.domainId ?? null

  return (
    <>
      <div className="flex w-full max-w-full items-center gap-1">
        <Button
          type="button"
          variant="default"
          size="lg"
          className="min-w-0 flex-1"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          disabled={isLoadingDomains}
        >
          {isLoadingDomains ? <Spinner data-icon="inline-start" /> : null}
          <span className="min-w-0 flex-1 truncate text-left">
            {isLoadingDomains
              ? "Loading domains..."
              : (activeAddress?.address ?? "Select address")}
          </span>
          {!isLoadingDomains ? (
            <MailIcon className="size-4" data-icon="inline-end" />
          ) : null}
        </Button>
        {!hideGenerate && (
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label="Generate random email address"
            disabled={
              isSelectingDomain ||
              isLoadingDomains ||
              sortedDomains.length === 0
            }
            onClick={() => void handleGenerateRandomAddress()}
          >
            {isSelectingDomain ? <Spinner /> : <RefreshCwIcon />}
          </Button>
        )}
      </div>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Select email domain"
        description="Search and choose a domain for the active email address."
        className="sm:max-w-md"
      >
        <Command>
          <div className="flex items-center gap-2 p-1 pb-0">
            <InputGroup className="h-8! flex-1 rounded-lg! border-input/30 bg-input/30 shadow-none! *:data-[slot=input-group-addon]:pl-2!">
              <CommandPrimitive.Input
                data-slot="command-input"
                className="w-full text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Search domain..."
              />
              <InputGroupAddon>
                <SearchIcon className="shrink-0 opacity-50" />
              </InputGroupAddon>
            </InputGroup>
            <Button
              variant="default"
              size="default"
              asChild
              className="shrink-0"
            >
              <Link href="/inbox" className="relative overflow-hidden">
                {showLogin ? (
                  <LogIn className="size-4" />
                ) : (
                  <Plus className="size-4" />
                )}
                <span className="relative h-5 w-22 overflow-hidden">
                  <span
                    className={`absolute inset-0 flex items-center transition-all duration-500 ${
                      showLogin
                        ? "translate-y-0 opacity-100"
                        : "-translate-y-full opacity-0"
                    }`}
                  >
                    Login
                  </span>
                  <span
                    className={`absolute inset-0 flex items-center transition-all duration-500 ${
                      showLogin
                        ? "translate-y-full opacity-0"
                        : "translate-y-0 opacity-100"
                    }`}
                  >
                    Add Domain
                  </span>
                </span>
              </Link>
            </Button>
          </div>
          <CommandList>
            {isLoadingDomains ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="mr-2" />
                <span className="text-sm text-muted-foreground">
                  Loading domains...
                </span>
              </div>
            ) : sortedDomains.length === 0 ? (
              <CommandEmpty>
                No domains available. Check server connection.
              </CommandEmpty>
            ) : (
              <>
                <CommandEmpty>No domains found.</CommandEmpty>
                <CommandGroup heading="Domains">
                  {sortedDomains.map((domain) => {
                    const isActive = domain.id === activeDomainId
                    const isLoading = domain.id === loadingDomainId

                    return (
                      <CommandItem
                        key={domain.id}
                        value={domain.name}
                        data-checked={isActive}
                        disabled={isSelectingDomain}
                        onSelect={() => void handleSelectDomain(domain)}
                      >
                        {isLoading ? <Spinner /> : <GlobeIcon />}
                        <span className="min-w-0 flex-1 truncate">
                          {domain.name}
                        </span>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
