"use client"

import { useEffect, useRef } from "react"
import { fetchInboxState, syncInboxState } from "@/services/inbox-state.service"
import { useAuthStore } from "@/stores/auth.store"
import { useInboxStore } from "@/stores/inbox.store"

export function InboxStateSync() {
  const user = useAuthStore((s) => s.user)
  const isLoaded = useAuthStore((s) => s.isLoaded)
  const syncedRef = useRef(false)

  useEffect(() => {
    if (!isLoaded) return

    if (!user) return

    if (syncedRef.current) return
    syncedRef.current = true

    async function load() {
      const server = await fetchInboxState()
      if (!server) return

      const store = useInboxStore.getState()

      const mergedReadIds = new Set([...store.readIds, ...server.readIds])
      const mergedTrashedIds = new Set([...store.trashedIds, ...server.trashedIds])
      const mergedPermanentlyDeletedIds = new Set([
        ...store.permanentlyDeletedIds,
        ...server.permanentlyDeletedIds,
      ])
      const mergedSpamSenders = new Set([
        ...store.spamSenders,
        ...server.spamSenders,
      ])

      const hasNewServerData =
        server.readIds.some((id) => !store.readIds.has(id)) ||
        server.trashedIds.some((id) => !store.trashedIds.has(id)) ||
        server.permanentlyDeletedIds.some(
          (id) => !store.permanentlyDeletedIds.has(id)
        ) ||
        server.spamSenders.some((email) => !store.spamSenders.has(email))

      if (hasNewServerData) {
        useInboxStore.setState({
          readIds: mergedReadIds,
          trashedIds: mergedTrashedIds,
          permanentlyDeletedIds: mergedPermanentlyDeletedIds,
          spamSenders: mergedSpamSenders,
        })
      }

      const mergedState = {
        readIds: [...mergedReadIds],
        trashedIds: [...mergedTrashedIds],
        permanentlyDeletedIds: [...mergedPermanentlyDeletedIds],
        spamSenders: [...mergedSpamSenders],
      }

      const localHasMore =
        store.readIds.size > server.readIds.length ||
        store.trashedIds.size > server.trashedIds.length ||
        store.permanentlyDeletedIds.size > server.permanentlyDeletedIds.length ||
        store.spamSenders.size > server.spamSenders.length

      if (hasNewServerData || localHasMore) {
        await syncInboxState(mergedState)
      }
    }

    void load()
  }, [user, isLoaded])

  useEffect(() => {
    if (!user) return

    const unsub = useInboxStore.subscribe((state) => {
      void syncInboxState({
        readIds: [...state.readIds],
        trashedIds: [...state.trashedIds],
        permanentlyDeletedIds: [...state.permanentlyDeletedIds],
        spamSenders: [...state.spamSenders],
      })
    })

    return unsub
  }, [user])

  return null
}
