"use client"

import { useEffect } from "react"
import { useParams } from "next/navigation"
import { useAddressStore } from "@/stores/address.store"

export default function SyncActiveAddress() {
  const params = useParams<{ slug?: string[] }>()
  const setActiveAddress = useAddressStore((s) => s.setActiveAddress)
  const addresses = useAddressStore((s) => s.addresses)

  useEffect(() => {
    const slug = params.slug
    if (!slug) return

    if (slug.length === 2) {
      const [username, domain] = slug
      const address = addresses.find(
        (a) => a.username === username && a.domainName === domain
      )
      if (address) {
        setActiveAddress(address.id)
      }
    } else if (slug.length === 1) {
      const [addressId] = slug
      setActiveAddress(addressId)
    }
  }, [params.slug, addresses, setActiveAddress])

  return null
}
