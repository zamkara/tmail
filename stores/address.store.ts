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

function keepLatestAddressPerDomain(addresses: GeneratedAddress[]) {
  const latestByDomain = new Map<string, GeneratedAddress>()

  for (const address of addresses) {
    const current = latestByDomain.get(address.domainId)
    if (!current) {
      latestByDomain.set(address.domainId, address)
      continue
    }

    if (
      new Date(address.createdAt).getTime() >
      new Date(current.createdAt).getTime()
    ) {
      latestByDomain.set(address.domainId, address)
    }
  }

  return [...latestByDomain.values()]
}

export const useAddressStore = create<AddressStore>()(
  persist(
    (set) => ({
      addresses: [],
      activeAddressId: null,
      isLoaded: false,
      setAddresses: (addresses) =>
        set({
          addresses: keepLatestAddressPerDomain(addresses),
          isLoaded: true,
        }),
      setLoaded: () => set({ isLoaded: true }),
      addAddress: (address) =>
        set((state) => ({
          addresses: [
            ...state.addresses.filter(
              (currentAddress) => currentAddress.domainId !== address.domainId
            ),
            address,
          ],
        })),
      addAddressAndSetActive: (address) =>
        set((state) => ({
          addresses: [
            ...state.addresses.filter(
              (currentAddress) => currentAddress.domainId !== address.domainId
            ),
            address,
          ],
          activeAddressId: address.id,
        })),
      updateAddress: (id, partial) =>
        set((state) => ({
          addresses: state.addresses.map((addr) =>
            addr.id === id ? { ...addr, ...partial } : addr
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
    { name: "tmail-addresses-v2" }
  )
)
