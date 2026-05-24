"use client"

import { useEffect, useMemo, useRef } from "react"

import { buildBackendWsUrl, getBackendBaseUrl } from "@/services/backend.service"
import { useAddressStore } from "@/stores/address.store"

type BackendInboxUpdateDetail = {
  email?: string
  message?: {
    id?: string
    [key: string]: unknown
  }
}

export default function BackendInboxSync() {
  const activeAddress = useAddressStore((state) =>
    state.addresses.find((address) => address.id === state.activeAddressId)
  )
  const socketRef = useRef<WebSocket | null>(null)

  const websocketUrl = useMemo(() => {
    if (!activeAddress?.address) return null
    const base = buildBackendWsUrl("/ws")
    if (!base) return null

    try {
      const url = new URL(base)
      url.searchParams.set("email", activeAddress.address)
      return url.toString()
    } catch {
      return null
    }
  }, [activeAddress?.address])

  useEffect(() => {
    if (!websocketUrl || !getBackendBaseUrl()) {
      return
    }

    let cancelled = false

    try {
      socketRef.current?.close()
      const socket = new WebSocket(websocketUrl)
      socketRef.current = socket

      socket.addEventListener("message", (event) => {
        if (cancelled) return

        let payload: BackendInboxUpdateDetail | null = null
        try {
          payload = JSON.parse(String(event.data)) as BackendInboxUpdateDetail
        } catch {
          return
        }

        window.dispatchEvent(
          new CustomEvent("tmail:backend-inbox-update", {
            detail: {
              email: payload?.email ?? activeAddress?.address ?? null,
              message: payload?.message ?? null,
            },
          })
        )
      })
    } catch {
      // Keep polling as the fallback if the websocket cannot connect.
    }

    return () => {
      cancelled = true
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [activeAddress?.address, websocketUrl])

  return null
}
