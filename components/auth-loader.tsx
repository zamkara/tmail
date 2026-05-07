"use client"

import { useEffect } from "react"
import { getMe } from "@/services/auth.service"
import { getAddresses } from "@/services/address.service"
import { useAuthStore } from "@/stores/auth.store"
import { useAddressStore } from "@/stores/address.store"

export function AuthLoader() {
  const setUser = useAuthStore((s) => s.setUser)
  const setAuthLoaded = useAuthStore((s) => s.setLoaded)
  const setAddresses = useAddressStore((s) => s.setAddresses)
  const setAddressLoaded = useAddressStore((s) => s.setLoaded)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const user = await getMe()
        if (!cancelled) setUser(user)

        if (user) {
          const addresses = await getAddresses()
          if (!cancelled) setAddresses(addresses)
        } else {
          if (!cancelled) setAddressLoaded()
        }
      } catch {
        if (!cancelled) {
          setUser(null)
          setAddressLoaded()
        }
      } finally {
        if (!cancelled) setAuthLoaded()
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [setUser, setAuthLoaded, setAddresses, setAddressLoaded])

  return null
}
