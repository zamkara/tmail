"use client"

import { usePathname } from "next/navigation"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  buildInboxFolderHref,
  getInboxFolderFromPathname,
  type InboxFolder,
} from "@/lib/inbox"
import { useAddressStore } from "@/stores/address.store"
import type { GeneratedAddress } from "@/types"

const folderLabels: Record<InboxFolder, string> = {
  inbox: "Inbox",
  junk: "Junk",
  trash: "Trash",
}

function getPathParts(pathname: string) {
  const segments = pathname.split("/").filter(Boolean)
  let folder: InboxFolder = "inbox"
  let rest = segments[0] === "inbox" ? segments.slice(1) : segments

  if (rest[0] === "junk" || rest[0] === "trash") {
    folder = rest[0]
    rest = rest.slice(1)
  }

  return { folder, rest }
}

function findAddressFromPath(
  addresses: GeneratedAddress[],
  rest: string[],
  activeAddressId: string | null
) {
  const byId = rest[0]
    ? addresses.find((address) => address.id === rest[0])
    : null
  if (byId) return byId

  const byUsernameAndDomain =
    rest.length >= 2
      ? addresses.find(
          (address) =>
            address.username === rest[0] && address.domainName === rest[1]
        )
      : null
  if (byUsernameAndDomain) return byUsernameAndDomain

  return addresses.find((address) => address.id === activeAddressId) ?? null
}

function getMailIdFromPath(rest: string[], address: GeneratedAddress | null) {
  if (!address) return null

  const baseLength = address.username ? 2 : 1
  return rest.length > baseLength ? (rest[baseLength] ?? null) : null
}

function isEmailDetailPath(rest: string[], address: GeneratedAddress | null) {
  if (getMailIdFromPath(rest, address)) return true

  if (rest.length >= 3) return true

  return rest.length === 2 && !rest[1]?.includes(".")
}

function getFallbackAddressLabel(rest: string[]) {
  if (rest.length >= 2 && rest[1]?.includes(".")) {
    return `${decodeURIComponent(rest[0] ?? "")}@${decodeURIComponent(
      rest[1]
    )}`
  }

  return "Selected email"
}

export default function InboxBreadcrumb() {
  const pathname = usePathname()
  const addresses = useAddressStore((state) => state.addresses)
  const activeAddressId = useAddressStore((state) => state.activeAddressId)
  const parsed = getPathParts(pathname)
  const folder = getInboxFolderFromPathname(pathname)
  const activeAddress = findAddressFromPath(
    addresses,
    parsed.rest,
    activeAddressId
  )
  const mailId = getMailIdFromPath(parsed.rest, activeAddress)
  const isEmailDetail = isEmailDetailPath(parsed.rest, activeAddress)
  const addressLabel =
    activeAddress?.address ?? getFallbackAddressLabel(parsed.rest)
  const folderHref = activeAddress
    ? buildInboxFolderHref(activeAddress, folder)
    : "/inbox"

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="min-w-0 flex-nowrap">
        <BreadcrumbItem className="hidden md:inline-flex">
          <BreadcrumbLink href="/inbox">tmail</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="hidden md:inline-flex" />
        <BreadcrumbItem>
          <BreadcrumbLink
            href={folderHref}
            className={isEmailDetail ? undefined : "text-foreground"}
          >
            {folderLabels[folder]}
          </BreadcrumbLink>
        </BreadcrumbItem>
        {isEmailDetail ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="block max-w-[48vw] truncate md:max-w-[36vw]">
                {addressLabel}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : null}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
