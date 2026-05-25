"use client"

import { type ReactNode, useEffect, useState } from "react"
import {
  Building2Icon,
  GlobeIcon,
  SparklesIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import DomainBadge from "@/components/shared/domain-badge"
import AddDomainDialog from "@/components/sidebar/add-domain-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldGroup,
} from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { generateAddress } from "@/services/address.service"
import {
  deleteDomain,
  getDomains,
  setDomainVisibility,
} from "@/services/domain.service"
import { useAddressStore } from "@/stores/address.store"
import { useDomainStore } from "@/stores/domain.store"
import { useAuthStore } from "@/stores/auth.store"
import { useInboxStore } from "@/stores/inbox.store"
import { buildInboxHref } from "@/lib/inbox"
import { resolveDomainSource } from "@/lib/domain-source"
import { cn } from "@/lib/utils"
import type { Domain } from "@/types"

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

function formatPrivateUntil(value?: string | null) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function hasPrivateAccessWindow(domain: Domain) {
  if (!domain.privateUntil) return false

  const time = new Date(domain.privateUntil).getTime()
  return !Number.isNaN(time) && time > Date.now()
}

function randomSubdomainLabel() {
  const chars = "abcdefghijklmnopqrstuvwxyz"

  return Array.from(
    { length: 4 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("")
}

function isPremiumActive(user: ReturnType<typeof useAuthStore.getState>["user"]) {
  return Boolean(
    user?.isPremium &&
      user.premiumUntil &&
      new Date(user.premiumUntil).getTime() > Date.now()
  )
}

export default function DomainSection({ compact = false }: DomainSectionProps) {
  const domains = useDomainStore((state) => state.domains)
  const setDomains = useDomainStore((state) => state.setDomains)
  const updateDomain = useDomainStore((state) => state.updateDomain)
  const removeDomain = useDomainStore((state) => state.removeDomain)
  const addresses = useAddressStore((state) => state.addresses)
  const setAddresses = useAddressStore((state) => state.setAddresses)
  const addAddress = useAddressStore((state) => state.addAddress)
  const setActiveAddress = useAddressStore((state) => state.setActiveAddress)
  const activeAddressId = useAddressStore((state) => state.activeAddressId)
  const [loadingDomainId, setLoadingDomainId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Domain | null>(null)
  const [isDeletingDomain, setIsDeletingDomain] = useState(false)
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const resetInbox = useInboxStore((s) => s.resetInbox)

  useEffect(() => {
    let cancelled = false
    async function loadDomains() {
      try {
        const nextDomains = await getDomains()
        if (!cancelled) {
          setDomains(nextDomains)
        }
      } catch {
        if (!cancelled) {
          toast.error("Failed to load domains")
        }
      }
    }

    void loadDomains()

    return () => {
      cancelled = true
    }
  }, [setDomains, user?.id])

  const ownedDomains = domains.filter((domain) => domain.isOwnedByUser)
  const sortedDomains = [...ownedDomains].sort((first, second) => {
    const order = { system: 0, user: 1, guest: 2 } as const
    const firstSource = resolveDomainSource(first)
    const secondSource = resolveDomainSource(second)
    if (firstSource !== secondSource) {
      return order[firstSource] - order[secondSource]
    }

    return first.name.localeCompare(second.name)
  })

  async function handleGenerateAddress(
    domainId: string,
    domainName: string,
    withSubdomain = false
  ) {
    setLoadingDomainId(domainId)

    try {
      const subdomain = withSubdomain ? randomSubdomainLabel() : ""
      const address = await generateAddress(
        domainId,
        domainName,
        !!user,
        subdomain
      )
      resetInbox()
      addAddress(address)
      setActiveAddress(address.id)
      router.push(buildInboxHref(address))
      toast.success(
        withSubdomain ? "Wildcard email address created" : "Email address created"
      )
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create email address"
      )
    } finally {
      setLoadingDomainId(null)
    }
  }

  async function handleDeleteDomain() {
    if (!deleteTarget) return

    setIsDeletingDomain(true)

    try {
      await deleteDomain(deleteTarget.id)

      const remainingAddresses = addresses.filter(
        (address) => address.domainId !== deleteTarget.id
      )
      const removedActiveAddress = addresses.some(
        (address) =>
          address.domainId === deleteTarget.id && address.id === activeAddressId
      )

      removeDomain(deleteTarget.id)
      setAddresses(remainingAddresses)

      if (removedActiveAddress) {
        resetInbox()
        const nextAddress = remainingAddresses[0] ?? null
        setActiveAddress(nextAddress?.id ?? null)
        router.push(nextAddress ? buildInboxHref(nextAddress) : "/inbox")
      }

      setDeleteTarget(null)
      toast.success("Domain deleted")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete domain"
      )
    } finally {
      setIsDeletingDomain(false)
    }
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Domains</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {sortedDomains.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              No custom domains yet.
            </p>
          ) : null}
          {sortedDomains.map((domain) => {
            const Icon = domain.type === "system" ? GlobeIcon : Building2Icon
            const isLoading = loadingDomainId === domain.id
            const source = resolveDomainSource(domain)
            const canManageDomain = source === "user"
            const row = (
              <SidebarMenuButton
                type="button"
                size={compact ? "lg" : "default"}
                className={cn(
                  compact && "h-auto py-2",
                  canManageDomain && "pr-19!",
                  !canManageDomain && "cursor-default"
                )}
                aria-disabled={!canManageDomain}
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
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    <span className="min-w-0 flex-1 truncate">
                      {domain.name}
                    </span>
                    <StatusBadge
                      visibility={domain.visibility}
                      className="shrink-0"
                    />
                    {!compact && (
                      <DomainBadge type={domain.type} source={source} />
                    )}
                  </div>
                </div>
              </SidebarMenuButton>
            )

            return (
              <SidebarMenuItem key={domain.id}>
                {canManageDomain ? (
                  <ManageDomainDialog domain={domain} onUpdated={updateDomain}>
                    {row}
                  </ManageDomainDialog>
                ) : (
                  row
                )}
                <SidebarMenuAction
                  type="button"
                  aria-label={`Generate address from ${domain.name}`}
                  className={canManageDomain ? "right-14" : undefined}
                  disabled={isLoading}
                  onClick={() =>
                    void handleGenerateAddress(domain.id, domain.name)
                  }
                >
                  {isLoading ? <Spinner /> : <RefreshCwIcon />}
                </SidebarMenuAction>
                {canManageDomain ? (
                  <>
                    <SidebarMenuAction
                      type="button"
                      aria-label={`Generate wildcard address from ${domain.name}`}
                      className="right-8"
                      disabled={isLoading}
                      onClick={() =>
                        void handleGenerateAddress(domain.id, domain.name, true)
                      }
                    >
                      {isLoading ? <Spinner /> : <SparklesIcon />}
                    </SidebarMenuAction>
                    <SidebarMenuAction
                      type="button"
                      aria-label={`Delete ${domain.name}`}
                      className="right-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      disabled={isDeletingDomain}
                      onClick={() => setDeleteTarget(domain)}
                    >
                      <Trash2Icon />
                    </SidebarMenuAction>
                  </>
                ) : null}
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
        <div className="mt-2">
          <AddDomainDialog />
        </div>
        <Dialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null)
          }}
        >
          <DialogContent className="p-0 sm:max-w-sm">
            <DialogHeader className="px-4 pt-4">
              <DialogTitle>Delete domain?</DialogTitle>
              <DialogDescription>
                {deleteTarget?.name} and its active email addresses will be
                removed.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 px-4 pb-4 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={isDeletingDomain}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isDeletingDomain}
                onClick={() => void handleDeleteDomain()}
              >
                {isDeletingDomain ? <Spinner /> : null}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function ManageDomainDialog({
  domain,
  children,
  onUpdated,
}: {
  domain: Domain
  children: ReactNode
  onUpdated: (domain: Domain) => void
}) {
  const [open, setOpen] = useState(false)
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false)
  const authUser = useAuthStore((s) => s.user)
  const privateUntilLabel = formatPrivateUntil(domain.privateUntil)
  const isPrivate = domain.visibility === "private"
  const canTogglePrivate = isPremiumActive(authUser) || hasPrivateAccessWindow(domain)

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="p-0 sm:max-w-md">
        <div>
          <DialogHeader className="p-4 pb-3">
            <DialogTitle>Domain Access</DialogTitle>
            <DialogDescription>
              Manage private access for this domain in `/inbox`.
            </DialogDescription>
          </DialogHeader>
          <Separator />
          <div className="p-4">
            <FieldGroup>
              <Field>
                <div className="rounded-md border border-input bg-muted/30 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 truncate text-muted-foreground">
                      {privateUntilLabel
                        ? `Active until ${privateUntilLabel}`
                        : ""}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <StatusBadge visibility={domain.visibility} />
                      {canTogglePrivate ? (
                        <div className="flex items-center">
                          <Switch
                            id={`domain-private-${domain.id}`}
                            checked={isPrivate}
                            disabled={isUpdatingVisibility}
                            onCheckedChange={async (checked) => {
                              setIsUpdatingVisibility(true)

                              try {
                                const nextDomain = await setDomainVisibility(
                                  domain.id,
                                  checked ? "private" : "public"
                                )
                                onUpdated(nextDomain)
                                toast.success(
                                  checked
                                    ? "Domain switched to private"
                                    : "Domain switched to public"
                                )
                              } catch (caughtError) {
                                toast.error(
                                  caughtError instanceof Error
                                    ? caughtError.message
                                    : "Failed to update domain access"
                                )
                              } finally {
                                setIsUpdatingVisibility(false)
                              }
                            }}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Field>
              {!canTogglePrivate ? (
                <p className="text-sm text-muted-foreground">
                  Activate a subscription from Billing before making this domain
                  private.
                </p>
              ) : null}
            </FieldGroup>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StatusBadge({
  visibility = "public",
  className,
}: {
  visibility?: Domain["visibility"]
  className?: string
}) {
  return (
    <Badge variant="outline" className={className}>
      {visibility === "private" ? "Private" : "Public"}
    </Badge>
  )
}
