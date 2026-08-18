import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { GeneratedAddress } from "@/types"

interface AddressStore {
  addresses: GeneratedAddress[]
  activeAddressId: string | null
  isLoaded: boolean
  setAddresses: (addresses: GeneratedAddress[]) => void
  setLoaded: () => void
  addAddress: (address: GeneratedAddress) => void
  addAddressAndSetActive: (address: GeneratedAddress) => void
  updateAddress: (id: string, partial: Partial<GeneratedAddress>) => void
  removeAddress: (id: string) => void
  setActiveAddress: (id: string | null) => void
  removeExpired: () => void
}

function mergeAddresses(addresses: GeneratedAddress[]) {
  const byId = new Map<string, GeneratedAddress>()

  for (const address of addresses) {
    byId.set(address.id, address)
  }

  return [...byId.values()].sort(
    (first, second) =>
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
  )
}

export const useAddressStore = create<AddressStore>()(
  persist(
    (set) => ({
      addresses: [],
      activeAddressId: null,
      isLoaded: false,
      setAddresses: (addresses) =>
        set({
          addresses: mergeAddresses(addresses),
          isLoaded: true,
        }),
      setLoaded: () => set({ isLoaded: true }),
      addAddress: (address) =>
        set((state) => ({
          addresses: mergeAddresses([address, ...state.addresses]),
        })),
      addAddressAndSetActive: (address) =>
        set((state) => ({
          addresses: mergeAddresses([address, ...state.addresses]),
          activeAddressId: address.id,
        })),
      updateAddress: (id, partial) =>
        set((state) => ({
          addresses: mergeAddresses(
            state.addresses.map((addr) =>
              addr.id === id ? { ...addr, ...partial } : addr
            )
          ),
        })),
      removeAddress: (id) =>
        set((state) => {
          const addresses = state.addresses.filter((addr) => addr.id !== id)
          return {
            addresses,
            activeAddressId:
              state.activeAddressId === id
                ? (addresses[0]?.id ?? null)
                : state.activeAddressId,
          }
        }),
      setActiveAddress: (id) => set({ activeAddressId: id }),
      removeExpired: () =>
        set((state) => ({
          addresses: state.addresses.filter(
            (address) => new Date(address.expiresAt) > new Date()
          ),
        })),
    }),
    {
      name: "tmail-addresses-v2",
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error("Failed to hydrate address store:", error)
        }

        state?.setLoaded()
      },
    }
  )
)
