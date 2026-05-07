"use client"

import { useEffect } from "react"
import { useParams } from "next/navigation"
import { useAddressStore } from "@/stores/address.store"

export default function SyncActiveAddress() {
  const params = useParams<{ addressId?: string }>()
  const setActiveAddress = useAddressStore((s) => s.setActiveAddress)

  useEffect(() => {
    if (params.addressId) {
      setActiveAddress(params.addressId)
    }
  }, [params.addressId, setActiveAddress])

  return null
}
