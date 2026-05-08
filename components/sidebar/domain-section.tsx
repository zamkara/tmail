"use client"

import { type FormEvent, type ReactNode, useEffect, useState } from "react"
import {
  Building2Icon,
  GlobeIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import DomainBadge from "@/components/shared/domain-badge"
import AddDomainDialog from "@/components/sidebar/add-domain-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import { generateAddress } from "@/services/address.service"
import {
  deleteDomain,
  getDomains,
  updateDomain as updateDomainRequest,
} from "@/services/domain.service"
import { useAddressStore } from "@/stores/address.store"
import { useDomainStore } from "@/stores/domain.store"
import { useAuthStore } from "@/stores/auth.store"
import { useInboxStore } from "@/stores/inbox.store"
import { isValidDomain } from "@/lib/domain-validation"
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

export default function DomainSection({ compact = false }: DomainSectionProps) {
  const domains = useDomainStore((state) => state.domains)
  const isLoaded = useDomainStore((state) => state.isLoaded)
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
    if (isLoaded) {
      return
    }

    async function loadDomains() {
      try {
        const nextDomains = await getDomains()
        setDomains(nextDomains)
      } catch {
        toast.error("Failed to load domains")
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
            const row = (
              <SidebarMenuButton
                type="button"
                className={cn(
                  compact && "h-9",
                  domain.type === "system" && "cursor-default"
                )}
                aria-disabled={domain.type === "system"}
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
                  <span className="min-w-0 flex-1 truncate">{domain.name}</span>
                  {!compact && <DomainBadge type={domain.type} />}
                </div>
              </SidebarMenuButton>
            )

            return (
              <SidebarMenuItem key={domain.id}>
                {domain.type === "custom" ? (
                  <ManageDomainDialog
                    domain={domain}
                    onUpdated={updateDomain}
                    onDeleted={removeDomain}
                  >
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
  onDeleted,
}: {
  domain: Domain
  children: ReactNode
  onUpdated: (domain: Domain) => void
  onDeleted: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(domain.name)
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedName = name.trim().toLowerCase()

    if (!isValidDomain(normalizedName)) {
      setError("Invalid domain format")
      return
    }

    setError("")
    setIsSaving(true)

    try {
      const nextDomain = await updateDomainRequest(domain.id, normalizedName)
      onUpdated(nextDomain)
      toast.success("Domain updated")
      setOpen(false)
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to update domain"
      setError(message)
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(`Delete domain ${domain.name}?`)
    if (!confirmed) return

    setIsDeleting(true)

    try {
      await deleteDomain(domain.id)
      onDeleted(domain.id)
      toast.success("Domain deleted")
      setOpen(false)
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to delete domain"
      setError(message)
      toast.error(message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) {
          setName(domain.name)
          setError("")
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="p-0 sm:max-w-md">
        <form onSubmit={(event) => void handleUpdate(event)}>
          <DialogHeader className="p-4 pb-3">
            <DialogTitle>Manage domain</DialogTitle>
            <DialogDescription>
              Change or delete a custom domain. Renaming still requires
              passing MX verification.
            </DialogDescription>
          </DialogHeader>
          <Separator />
          <div className="p-4">
            <FieldGroup>
              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor={`domain-${domain.id}`}>Domain</FieldLabel>
                <Input
                  id={`domain-${domain.id}`}
                  value={name}
                  disabled={isSaving || isDeleting}
                  aria-invalid={Boolean(error)}
                  onChange={(event) => {
                    setName(event.target.value)
                    setError("")
                  }}
                />
                <FieldError>{error}</FieldError>
              </Field>
            </FieldGroup>
          </div>
          <DialogFooter className="mx-0 mb-0 rounded-none border-t p-4">
            <Button
              type="button"
              variant="destructive"
              disabled={isSaving || isDeleting}
              onClick={() => void handleDelete()}
            >
              {isDeleting ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Trash2Icon data-icon="inline-start" />
              )}
              Delete
            </Button>
            <Button type="submit" disabled={isSaving || isDeleting}>
              {isSaving && <Spinner data-icon="inline-start" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
