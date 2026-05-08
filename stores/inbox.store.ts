import { create } from "zustand"
import { persist } from "zustand/middleware"

interface InboxStore {
  readIds: Set<string>
  trashedIds: Set<string>
  permanentlyDeletedIds: Set<string>
  spamSenders: Set<string>
  markRead: (id: string) => void
  unmarkRead: (id: string) => void
  trashEmail: (id: string) => void
  restoreEmail: (id: string) => void
  deletePermanently: (id: string) => void
  markSpam: (email: string) => void
  unmarkSpam: (email: string) => void
  resetInbox: () => void
}

export const useInboxStore = create<InboxStore>()(
  persist(
    (set) => ({
      readIds: new Set(),
      trashedIds: new Set(),
      permanentlyDeletedIds: new Set(),
      spamSenders: new Set(),
      markRead: (id) =>
        set((state) => ({ readIds: new Set([...state.readIds, id]) })),
      unmarkRead: (id) =>
        set((state) => {
          const next = new Set(state.readIds)
          next.delete(id)
          return { readIds: next }
        }),
      trashEmail: (id) =>
        set((state) => ({ trashedIds: new Set([...state.trashedIds, id]) })),
      restoreEmail: (id) =>
        set((state) => {
          const nextTrash = new Set(state.trashedIds)
          nextTrash.delete(id)
          return { trashedIds: nextTrash }
        }),
      deletePermanently: (id) =>
        set((state) => {
          const nextTrash = new Set(state.trashedIds)
          nextTrash.delete(id)
          const nextDeleted = new Set(state.permanentlyDeletedIds)
          nextDeleted.add(id)
          return { trashedIds: nextTrash, permanentlyDeletedIds: nextDeleted }
        }),
      markSpam: (email) =>
        set((state) => ({ spamSenders: new Set([...state.spamSenders, email]) })),
      unmarkSpam: (email) =>
        set((state) => {
          const next = new Set(state.spamSenders)
          next.delete(email)
          return { spamSenders: next }
        }),
      resetInbox: () =>
        set({ readIds: new Set(), trashedIds: new Set(), permanentlyDeletedIds: new Set() }),
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
              permanentlyDeletedIds: new Set(parsed.state.permanentlyDeletedIds ?? []),
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
                permanentlyDeletedIds: [...value.state.permanentlyDeletedIds],
                spamSenders: [...value.state.spamSenders],
              },
            })
          ),
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
)
