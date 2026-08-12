"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ChevronDownIcon,
  GlobeIcon,
  MailIcon,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import InboxCtaButton from "@/components/guest/inbox-cta-button"
import { uniqueDomainsByName } from "@/lib/domain-list"
import { resolveDomainSource } from "@/lib/domain-source"
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
  return [...domains].sort((first, second) => {
    const order = { system: 0, user: 1, guest: 2 } as const
    const firstSource = resolveDomainSource(first)
    const secondSource = resolveDomainSource(second)
    if (firstSource !== secondSource) {
      return order[firstSource] - order[secondSource]
    }

    return first.name.localeCompare(second.name)
  })
}

function getPublicDomains(domains: Domain[]) {
  return uniqueDomainsByName(
    domains.filter(
      (domain) =>
        domain.visibility !== "private" &&
        domain.isVerified !== false &&
        domain.isBanned !== true
    )
  )
}

function findReusableAddress(addresses: GeneratedAddress[], domainId: string) {
  return addresses.find(
    (address) => address.domainId === domainId && isAddressAvailable(address)
  )
}

interface DomainAddressSwitcherProps {
  hideGenerate?: boolean
  trigger?: "full" | "icon"
}

export default function DomainAddressSwitcher({
  hideGenerate,
  trigger = "full",
}: DomainAddressSwitcherProps) {
  const [open, setOpen] = useState(false)
  const [isLoadingDomains, setIsLoadingDomains] = useState(true)
  const [loadingDomainId, setLoadingDomainId] = useState<string | null>(null)
  const domains = useDomainStore((state) => state.domains)
  const domainsLoaded = useDomainStore((state) => state.isLoaded)
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
    if (domainsLoaded) {
      setIsLoadingDomains(false)
      return
    }

    let cancelled = false

    async function loadDomains() {
      setIsLoadingDomains(true)
      try {
        const nextDomains = getPublicDomains(await getDomains())

        if (!cancelled) {
          if (nextDomains.length === 0) {
            console.warn("No public domains returned from API")
            toast.error("Failed to load domains from server")
          }
          setDomains(nextDomains)
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load domains:", error)
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
  }, [domainsLoaded, setDomains])

  const sortedDomains = useMemo(
    () => sortDomains(getPublicDomains(domains)),
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
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create email address"
      )
    } finally {
      setLoadingDomainId(null)
    }
  }

  async function handleGenerateRandomAddress() {
    const randomDomain =
      sortedDomains[Math.floor(Math.random() * sortedDomains.length)]

    if (!randomDomain) {
      toast.error(
        "No public domains are available. Private domains require owner access."
      )
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
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create email address"
      )
    } finally {
      setLoadingDomainId(null)
    }
  }

  const isSelectingDomain = loadingDomainId !== null
  const activeDomainId = activeAddress?.domainId ?? null

  return (
    <>
      <div
        className={
          trigger === "icon"
            ? "flex shrink-0 items-center"
            : "flex w-auto max-w-full items-center gap-1 md:w-full"
        }
      >
        {trigger === "icon" ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="default"
                size="icon-lg"
                className="shrink-0"
                aria-label="Select email domain"
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => setOpen(true)}
                disabled={isLoadingDomains}
              >
                {isLoadingDomains ? <Spinner /> : <ChevronDownIcon />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Select email domain</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="default"
                size="default"
                className="shrink-0 justify-center gap-0 px-3.5 md:h-9 md:min-w-0 md:flex-1 md:justify-between md:gap-1.5 md:px-2.5"
                aria-label="Select email domain"
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => setOpen(true)}
                disabled={isLoadingDomains}
              >
                {isLoadingDomains ? <Spinner data-icon="inline-start" /> : null}
                {!isLoadingDomains ? (
                  <span className="flex -translate-x-[3px] items-center justify-center md:hidden">
                    <MailIcon className="size-4" />
                  </span>
                ) : null}
                <span className="hidden min-w-0 flex-1 truncate text-left md:block">
                  {isLoadingDomains
                    ? "Loading domains..."
                    : (activeAddress?.address ?? "Select address")}
                </span>
                {!isLoadingDomains ? (
                  <MailIcon
                    className="hidden size-4 md:block"
                    data-icon="inline-end"
                  />
                ) : null}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Select email domain</TooltipContent>
          </Tooltip>
        )}
        {!hideGenerate && (
          <Tooltip>
            <TooltipTrigger asChild>
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
            </TooltipTrigger>
            <TooltipContent>Generate random email address</TooltipContent>
          </Tooltip>
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
            <InboxCtaButton className="shrink-0" />
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
                No public domains are available. Private domains require owner
                access.
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
