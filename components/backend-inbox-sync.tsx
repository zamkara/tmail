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

function dispatchWebSocketStatus(email: string | null, connected: boolean) {
  window.dispatchEvent(
    new CustomEvent("tmail:backend-ws-status", {
      detail: { email, connected },
    })
  )
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
      dispatchWebSocketStatus(activeAddress?.address ?? null, false)
      return
    }

    let cancelled = false
    const email = activeAddress?.address ?? null

    try {
      socketRef.current?.close()
      const socket = new WebSocket(websocketUrl)
      socketRef.current = socket

      socket.addEventListener("open", () => {
        if (!cancelled) dispatchWebSocketStatus(email, true)
      })

      socket.addEventListener("close", () => {
        if (!cancelled) dispatchWebSocketStatus(email, false)
      })

      socket.addEventListener("error", () => {
        if (!cancelled) dispatchWebSocketStatus(email, false)
      })

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
      dispatchWebSocketStatus(email, false)
    }

    return () => {
      cancelled = true
      dispatchWebSocketStatus(email, false)
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [activeAddress?.address, websocketUrl])

  return null
}
