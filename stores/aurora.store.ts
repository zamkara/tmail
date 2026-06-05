import { create } from "zustand"

interface AuroraStore {
  visible: boolean
  colorStops: [string, string, string]
  trigger: (colorStops?: [string, string, string]) => void
}

let timeoutId: ReturnType<typeof setTimeout> | null = null

export const useAuroraStore = create<AuroraStore>((set) => ({
  visible: false,
  colorStops: ["#dc67ff", "#420e73", "#420e73"],
  trigger: (colorStops) => {
    if (timeoutId) clearTimeout(timeoutId)
    set({
      visible: true,
      colorStops: colorStops ?? ["#dc67ff", "#420e73", "#420e73"],
    })
    timeoutId = setTimeout(() => {
      set({ visible: false })
      timeoutId = null
    }, 8000)
  },
}))
