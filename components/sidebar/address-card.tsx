"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { PencilIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import CountdownBadge from "@/components/shared/countdown-badge"
import CopyButton from "@/components/shared/copy-button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { buildInboxFolderHref, getInboxFolderFromPathname } from "@/lib/inbox"
import {
  deleteAddress,
  updateAddressLocalPart,
} from "@/services/address.service"
import { useAddressStore } from "@/stores/address.store"
import { useAuthStore } from "@/stores/auth.store"
import { useDomainStore } from "@/stores/domain.store"
import { useInboxStore } from "@/stores/inbox.store"
import type { GeneratedAddress } from "@/types"
import { cn } from "@/lib/utils"

interface AddressCardProps {
  address: GeneratedAddress
  compact?: boolean
}

function getAddressInitials(address: string) {
  const localPart = address.split("@")[0] ?? address
  return localPart.slice(0, 2).toUpperCase()
}

function getAddressDomain(address: GeneratedAddress) {
  return address.address.split("@")[1] || address.domainName || ""
}

function getAddressLocalPart(address: GeneratedAddress) {
  return address.address.split("@")[0] || ""
}

function isValidLocalPart(value: string) {
  return /^[a-z0-9][a-z0-9._-]{0,63}$/.test(value)
}

function isValidSubdomain(value: string) {
  if (!value) return false

  return value
    .split(".")
    .every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
}

export default function AddressCard({
  address,
  compact = false,
}: AddressCardProps) {
  const pathname = usePathname()
  const router = useRouter()
  const addresses = useAddressStore((state) => state.addresses)
  const domains = useDomainStore((state) => state.domains)
  const setActiveAddress = useAddressStore((state) => state.setActiveAddress)
  const removeAddress = useAddressStore((state) => state.removeAddress)
  const activeAddressId = useAddressStore((state) => state.activeAddressId)
  const resetInbox = useInboxStore((state) => state.resetInbox)
  const user = useAuthStore((state) => state.user)
  const updateAddress = useAddressStore((state) => state.updateAddress)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [localPart, setLocalPart] = useState(getAddressLocalPart(address))
  const [useWildcard, setUseWildcard] = useState(false)
  const [subdomain, setSubdomain] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const isActive = activeAddressId === address.id

  const activeFolder = getInboxFolderFromPathname(pathname)
  const href = buildInboxFolderHref(address, activeFolder)
  const actualDomainName = getAddressDomain(address)
  const rootDomainName =
    domains.find((domain) => domain.id === address.domainId)?.name ||
    address.domainName ||
    actualDomainName
  const currentSubdomain =
    actualDomainName !== rootDomainName &&
    actualDomainName.endsWith(`.${rootDomainName}`)
      ? actualDomainName.slice(0, -(rootDomainName.length + 1))
      : ""

  function openEditDialog() {
    setLocalPart(getAddressLocalPart(address))
    setUseWildcard(Boolean(currentSubdomain))
    setSubdomain(currentSubdomain)
    setEditOpen(true)
  }

  async function handleUpdateAddress() {
    const nextLocalPart = localPart.trim().toLowerCase()
    if (!isValidLocalPart(nextLocalPart)) {
      toast.error("Use lowercase letters, numbers, dots, dashes, or underscores")
      return
    }
    const nextSubdomain = useWildcard ? subdomain.trim().toLowerCase() : ""
    if (useWildcard && !isValidSubdomain(nextSubdomain)) {
      toast.error("Use a valid subdomain with lowercase letters, numbers, or dashes")
      return
    }

    const nextDomainName = useWildcard
      ? `${nextSubdomain}.${rootDomainName}`
      : rootDomainName
    const nextAddressValue = `${nextLocalPart}@${nextDomainName}`.toLowerCase()
    if (nextAddressValue === address.address.toLowerCase()) {
      setEditOpen(false)
      return
    }

    const duplicate = addresses.some(
      (item) =>
        item.id !== address.id &&
        item.address.toLowerCase() === nextAddressValue
    )
    if (duplicate) {
      toast.error("Email address is already in your active addresses")
      return
    }

    setIsSaving(true)
    try {
      const nextAddress =
        user && !address.id.startsWith("local_")
          ? await updateAddressLocalPart(
              address.id,
              nextLocalPart,
              nextSubdomain
            )
          : {
              ...address,
              address: nextAddressValue,
              domainName: nextDomainName,
            }

      updateAddress(address.id, nextAddress)

      if (isActive) {
        resetInbox()
        router.push(buildInboxFolderHref(nextAddress, activeFolder))
      }

      setEditOpen(false)
      toast.success("Email address updated")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update address"
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      if (user && !address.id.startsWith("local_")) {
        await deleteAddress(address.id)
      }

      const nextAddress = addresses.find((item) => item.id !== address.id)
      removeAddress(address.id)

      if (isActive) {
        resetInbox()
        setActiveAddress(nextAddress?.id ?? null)
        router.push(nextAddress ? buildInboxFolderHref(nextAddress, activeFolder) : "/inbox")
      }

      setConfirmOpen(false)
      toast.success("Email address deleted")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete address"
      )
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        size={compact ? "default" : "lg"}
        className={cn(compact && "h-10")}
      >
        <Link href={href} onClick={() => setActiveAddress(address.id)}>
          {compact && (
            <Avatar size="sm">
              <AvatarFallback>
                {getAddressInitials(address.address)}
              </AvatarFallback>
            </Avatar>
          )}
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate font-medium">{address.address}</span>
            {!compact && <CountdownBadge expiresAt={address.expiresAt} />}
          </span>
          {compact && <CountdownBadge expiresAt={address.expiresAt} />}
          <CopyButton text={address.address} />
          <button
            type="button"
            aria-label={`Customize ${address.address}`}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              openEditDialog()
            }}
          >
            <PencilIcon className="size-4" />
          </button>
          <button
            type="button"
            aria-label={`Delete ${address.address}`}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setConfirmOpen(true)
            }}
          >
            <Trash2Icon className="size-4" />
          </button>
        </Link>
      </SidebarMenuButton>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="p-0 sm:max-w-sm">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>Delete email address?</DialogTitle>
            <DialogDescription>
              {address.address} will be removed from your active addresses.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 px-4 pb-4 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={() => void handleDelete()}
            >
              {isDeleting ? <Spinner /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="p-0 sm:max-w-sm">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>Customize email address</DialogTitle>
            <DialogDescription>
              Change the email name and optionally use a wildcard subdomain.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-4">
            <Field>
              <FieldLabel htmlFor={`address-local-${address.id}`}>
                Email name
              </FieldLabel>
              <div className="flex min-w-0 items-center rounded-md border bg-background">
                <Input
                  id={`address-local-${address.id}`}
                  value={localPart}
                  disabled={isSaving}
                  className="min-w-0 flex-1 border-0 shadow-none focus-visible:ring-0"
                  onChange={(event) =>
                    setLocalPart(event.target.value.toLowerCase())
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void handleUpdateAddress()
                  }}
                />
                <span className="min-w-0 shrink truncate px-3 text-sm text-muted-foreground">
                  @{useWildcard && subdomain ? `${subdomain}.${rootDomainName}` : rootDomainName}
                </span>
              </div>
              <FieldDescription>
                Use lowercase letters, numbers, dots, dashes, or underscores.
              </FieldDescription>
            </Field>
            <Field>
              <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>Wildcard subdomain</span>
                <Switch
                  size="sm"
                  checked={useWildcard}
                  disabled={isSaving}
                  onCheckedChange={setUseWildcard}
                />
              </label>
            </Field>
            {useWildcard ? (
              <Field>
                <FieldLabel htmlFor={`address-subdomain-${address.id}`}>
                  Subdomain
                </FieldLabel>
                <div className="flex min-w-0 items-center rounded-md border bg-background">
                  <Input
                    id={`address-subdomain-${address.id}`}
                    value={subdomain}
                    disabled={isSaving}
                    placeholder="team"
                    className="min-w-0 flex-1 border-0 shadow-none focus-visible:ring-0"
                    onChange={(event) =>
                      setSubdomain(event.target.value.toLowerCase())
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void handleUpdateAddress()
                    }}
                  />
                  <span className="min-w-0 shrink truncate px-3 text-sm text-muted-foreground">
                    .{rootDomainName}
                  </span>
                </div>
                <FieldDescription>
                  Example: {localPart || "name"}@team.{rootDomainName}
                </FieldDescription>
              </Field>
            ) : null}
          </div>
          <DialogFooter className="gap-2 px-4 pb-4 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSaving}
              onClick={() => void handleUpdateAddress()}
            >
              {isSaving ? <Spinner /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarMenuItem>
  )
}
