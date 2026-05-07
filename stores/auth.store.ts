import { create } from "zustand"
import type { AuthUser } from "@/services/auth.service"

interface AuthStore {
  user: AuthUser | null
  isLoaded: boolean
  setUser: (user: AuthUser | null) => void
  setLoaded: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoaded: false,
  setUser: (user) => set({ user }),
  setLoaded: () => set({ isLoaded: true }),
}))
