import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { Domain } from "@/types"

interface DomainStore {
  domains: Domain[]
  isLoaded: boolean
  setDomains: (domains: Domain[]) => void
  addDomain: (domain: Domain) => void
}

export const useDomainStore = create<DomainStore>()(
  persist(
    (set) => ({
      domains: [],
      isLoaded: false,
      setDomains: (domains) => set({ domains, isLoaded: true }),
      addDomain: (domain) =>
        set((state) => ({ domains: [...state.domains, domain] })),
    }),
    { name: "tmail-domains" }
  )
)
