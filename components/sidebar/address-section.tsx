"use client"

import { useEffect } from "react"

import AddressCard from "@/components/sidebar/address-card"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from "@/components/ui/sidebar"
import { useAddressStore } from "@/stores/address.store"

export default function AddressSection({ compact = false }: { compact?: boolean }) {
  const addresses = useAddressStore((s) => s.addresses)
  const removeExpired = useAddressStore((s) => s.removeExpired)

  useEffect(() => {
    removeExpired()
  }, [removeExpired])

  const sorted = [...addresses].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Alamat Aktif</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {sorted.map((address) => (
            <AddressCard key={address.id} address={address} compact={compact} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
