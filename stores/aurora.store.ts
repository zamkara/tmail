import { create } from "zustand"

interface AuroraStore {
  visible: boolean
  trigger: () => void
}

let timeoutId: ReturnType<typeof setTimeout> | null = null

export const useAuroraStore = create<AuroraStore>((set) => ({
  visible: false,
  trigger: () => {
    if (timeoutId) clearTimeout(timeoutId)
    set({ visible: true })
    timeoutId = setTimeout(() => {
      set({ visible: false })
      timeoutId = null
    }, 8000)
  },
}))
