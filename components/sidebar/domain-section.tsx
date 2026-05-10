"use client"

import { type ReactNode, useEffect, useState } from "react"
import { Building2Icon, GlobeIcon, RefreshCwIcon } from "lucide-react"
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
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
  getDomains,
  redeemDomainVoucher,
  setDomainVisibility,
} from "@/services/domain.service"
import { useAddressStore } from "@/stores/address.store"
import { useDomainStore } from "@/stores/domain.store"
import { useAuthStore } from "@/stores/auth.store"
import { useInboxStore } from "@/stores/inbox.store"
import { buildInboxHref } from "@/lib/inbox"
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

export default function DomainSection({ compact = false }: DomainSectionProps) {
  const domains = useDomainStore((state) => state.domains)
  const setDomains = useDomainStore((state) => state.setDomains)
  const updateDomain = useDomainStore((state) => state.updateDomain)
  const removeDomain = useDomainStore((state) => state.removeDomain)
  const addAddress = useAddressStore((state) => state.addAddress)
  const setActiveAddress = useAddressStore((state) => state.setActiveAddress)
  const [loadingDomainId, setLoadingDomainId] = useState<string | null>(null)
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

  const sortedDomains = [...domains].sort((first, second) => {
    if (first.type !== second.type) {
      return first.type === "system" ? -1 : 1
    }

    return first.name.localeCompare(second.name)
  })

  async function handleGenerateAddress(domainId: string, domainName: string) {
    setLoadingDomainId(domainId)

    try {
      const address = await generateAddress(domainId, domainName, !!user)
      resetInbox()
      addAddress(address)
      setActiveAddress(address.id)
      router.push(buildInboxHref(address))
      toast.success("Email address created")
    } catch {
      toast.error("Failed to create email address")
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
            const canManageDomain = Boolean(
              domain.isOwnedByUser ?? domain.type === "custom"
            )
            const row = (
              <SidebarMenuButton
                type="button"
                size={compact ? "lg" : "default"}
                className={cn(
                  compact && "h-auto py-2",
                  !canManageDomain &&
                    domain.type === "system" &&
                    "cursor-default"
                )}
                aria-disabled={!canManageDomain && domain.type === "system"}
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
                    {!compact && <DomainBadge type={domain.type} />}
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
                  disabled={isLoading}
                  onClick={() =>
                    void handleGenerateAddress(domain.id, domain.name)
                  }
                >
                  {isLoading ? <Spinner /> : <RefreshCwIcon />}
                </SidebarMenuAction>
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
  const [voucherCode, setVoucherCode] = useState("")
  const [voucherError, setVoucherError] = useState("")
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false)
  const privateUntilLabel = formatPrivateUntil(domain.privateUntil)
  const isPrivate = domain.visibility === "private"
  const canTogglePrivate = hasPrivateAccessWindow(domain)

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) {
          setVoucherCode("")
          setVoucherError("")
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="p-0 sm:max-w-md">
        <div>
          <DialogHeader className="p-4 pb-3">
            <DialogTitle>Redeem Voucher</DialogTitle>
            <DialogDescription>
              Manage access for this domain in `/inbox`.
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
                <Field data-invalid={Boolean(voucherError)}>
                  <FieldLabel htmlFor={`voucher-${domain.id}`}>
                    Private Access Voucher
                  </FieldLabel>
                  <Input
                    id={`voucher-${domain.id}`}
                    value={voucherCode}
                    disabled={isRedeeming}
                    aria-invalid={Boolean(voucherError)}
                    placeholder="Enter voucher code"
                    onChange={(event) => {
                      setVoucherCode(event.target.value.toUpperCase())
                      setVoucherError("")
                    }}
                  />
                  <FieldError>{voucherError}</FieldError>
                </Field>
              ) : null}
              {!canTogglePrivate ? (
                <p className="text-sm text-muted-foreground">
                  Guests can still access this domain until a valid voucher is
                  redeemed.
                </p>
              ) : null}
            </FieldGroup>
          </div>
          {!canTogglePrivate ? (
            <DialogFooter className="mx-0 mb-0 rounded-none border-t p-4">
              <Button
                type="button"
                variant="outline"
                disabled={isRedeeming}
                onClick={async () => {
                  const normalizedCode = voucherCode.trim().toUpperCase()

                  if (!normalizedCode) {
                    setVoucherError("Enter a voucher code")
                    return
                  }

                  setVoucherError("")
                  setIsRedeeming(true)

                  try {
                    const redeemedDomain = await redeemDomainVoucher(
                      domain.id,
                      normalizedCode
                    )
                    onUpdated({
                      ...domain,
                      visibility: redeemedDomain.visibility,
                      privateUntil: redeemedDomain.privateUntil ?? null,
                      isVerified: true,
                    })
                    toast.success("Domain is now private")
                    setVoucherCode("")
                    setOpen(false)
                  } catch (caughtError) {
                    const message =
                      caughtError instanceof Error
                        ? caughtError.message
                        : "Failed to redeem voucher"
                    setVoucherError(message)
                    toast.error(message)
                  } finally {
                    setIsRedeeming(false)
                  }
                }}
              >
                {isRedeeming ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <RefreshCwIcon data-icon="inline-start" />
                )}
                Redeem
              </Button>
            </DialogFooter>
          ) : null}
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
