"use client"

import { useEffect } from "react"
import { useParams } from "next/navigation"

import { resolveActiveAddress } from "@/lib/inbox"
import { useAddressStore } from "@/stores/address.store"

export default function SyncActiveAddress() {
  const params = useParams<{ slug?: string[] }>()
  const setActiveAddress = useAddressStore((s) => s.setActiveAddress)
  const addresses = useAddressStore((s) => s.addresses)
  const activeAddressId = useAddressStore((s) => s.activeAddressId)

  useEffect(() => {
    const address = resolveActiveAddress(addresses, params, activeAddressId)
    if (address) {
      setActiveAddress(address.id)
    }
  }, [params.slug, addresses, activeAddressId, setActiveAddress])

  return null
}
