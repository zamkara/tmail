import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { AuthUser } from "@/services/auth.service"

interface AuthStore {
  user: AuthUser | null
  isLoaded: boolean
  setUser: (user: AuthUser | null) => void
  setLoaded: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isLoaded: false,
      setUser: (user) => {
        const currentUser = get().user

        if (
          user &&
          currentUser &&
          user.id === currentUser.id &&
          !user.avatarPreset &&
          currentUser.avatarPreset
        ) {
          set({
            user: {
              ...user,
              avatarPreset: currentUser.avatarPreset,
            },
          })
          return
        }

        set({ user })
      },
      setLoaded: () => set({ isLoaded: true }),
    }),
    {
      name: "tmail-auth",
      partialize: (state) => ({ user: state.user }),
    }
  )
)
