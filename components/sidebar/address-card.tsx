"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import CountdownBadge from "@/components/shared/countdown-badge"
import CopyButton from "@/components/shared/copy-button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { useAddressStore } from "@/stores/address.store"
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

const FOLDER_PATHS = ["/inbox/junk", "/inbox/trash"]

export default function AddressCard({
  address,
  compact = false,
}: AddressCardProps) {
  const pathname = usePathname()
  const setActiveAddress = useAddressStore((state) => state.setActiveAddress)
  const activeAddressId = useAddressStore((state) => state.activeAddressId)
  const isActive = activeAddressId === address.id

  // Pertahankan folder aktif saat pindah address
  const activeFolder = FOLDER_PATHS.find((f) => pathname.startsWith(f)) ?? "/inbox"
  const href = `${activeFolder}/${address.id}`

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        size={compact ? "default" : "lg"}
        className={cn(compact && "h-10")}
      >
        <Link
          href={href}
          onClick={() => setActiveAddress(address.id)}
        >
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
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
