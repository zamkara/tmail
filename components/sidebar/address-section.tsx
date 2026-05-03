"use client"

import { useEffect } from "react"
import { toast } from "sonner"

import AddressCard from "@/components/sidebar/address-card"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from "@/components/ui/sidebar"
import { getAddresses } from "@/services/address.service"
import { useAddressStore } from "@/stores/address.store"

interface AddressSectionProps {
  compact?: boolean
}

export default function AddressSection({
  compact = false,
}: AddressSectionProps) {
  const addresses = useAddressStore((state) => state.addresses)
  const isLoaded = useAddressStore((state) => state.isLoaded)
  const setAddresses = useAddressStore((state) => state.setAddresses)
  const removeExpired = useAddressStore((state) => state.removeExpired)

  useEffect(() => {
    removeExpired()
  }, [removeExpired])

  useEffect(() => {
    if (isLoaded) {
      return
    }

    async function loadAddresses() {
      try {
        const nextAddresses = await getAddresses()
        setAddresses(nextAddresses)
      } catch {
        toast.error("Gagal memuat alamat aktif")
      }
    }

    void loadAddresses()
  }, [isLoaded, setAddresses])

  const sortedAddresses = [...addresses].sort(
    (first, second) =>
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
  )

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Alamat Aktif</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {sortedAddresses.map((address) => (
            <AddressCard key={address.id} address={address} compact={compact} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
