import { create } from "zustand"
import { persist } from "zustand/middleware"

interface InboxStore {
  readIds: Set<string>
  trashedIds: Set<string>
  spamSenders: Set<string>
  markRead: (id: string) => void
  trashEmail: (id: string) => void
  markSpam: (email: string) => void
  resetInbox: () => void
}

export const useInboxStore = create<InboxStore>()(
  persist(
    (set) => ({
      readIds: new Set(),
      trashedIds: new Set(),
      spamSenders: new Set(),
      markRead: (id) =>
        set((state) => ({ readIds: new Set([...state.readIds, id]) })),
      trashEmail: (id) =>
        set((state) => ({ trashedIds: new Set([...state.trashedIds, id]) })),
      markSpam: (email) =>
        set((state) => ({ spamSenders: new Set([...state.spamSenders, email]) })),
      resetInbox: () =>
        set({ readIds: new Set(), trashedIds: new Set() }),
    }),
    {
      name: "tmail-inbox",
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          if (!str) return null
          const parsed = JSON.parse(str)
          return {
            ...parsed,
            state: {
              ...parsed.state,
              readIds: new Set(parsed.state.readIds ?? []),
              trashedIds: new Set(parsed.state.trashedIds ?? []),
              spamSenders: new Set(parsed.state.spamSenders ?? []),
            },
          }
        },
        setItem: (name, value) =>
          localStorage.setItem(
            name,
            JSON.stringify({
              ...value,
              state: {
                ...value.state,
                readIds: [...value.state.readIds],
                trashedIds: [...value.state.trashedIds],
                spamSenders: [...value.state.spamSenders],
              },
            })
          ),
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
)
