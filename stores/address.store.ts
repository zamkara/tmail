import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { GeneratedAddress } from "@/types"

interface AddressStore {
  addresses: GeneratedAddress[]
  activeAddressId: string | null
  isLoaded: boolean
  setAddresses: (addresses: GeneratedAddress[]) => void
  addAddress: (address: GeneratedAddress) => void
  setActiveAddress: (id: string | null) => void
  removeExpired: () => void
}

export const useAddressStore = create<AddressStore>()(
  persist(
    (set) => ({
      addresses: [],
      activeAddressId: null,
      isLoaded: false,
      setAddresses: (addresses) => set({ addresses, isLoaded: true }),
      addAddress: (address) =>
        set((state) => ({
          addresses: [
            ...state.addresses.filter(
              (currentAddress) => currentAddress.domainId !== address.domainId
            ),
            address,
          ],
        })),
      setActiveAddress: (id) => set({ activeAddressId: id }),
      removeExpired: () =>
        set((state) => ({
          addresses: state.addresses.filter(
            (address) => new Date(address.expiresAt) > new Date()
          ),
        })),
    }),
    { name: "tmail-addresses" }
  )
)
