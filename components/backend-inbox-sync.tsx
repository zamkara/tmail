"use client"

import { useEffect, useMemo, useRef } from "react"

import { useAddressStore } from "@/stores/address.store"

const PUBLIC_EMAIL_WS_URL = process.env.NEXT_PUBLIC_EMAIL_WS_URL?.trim() ?? ""

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
    if (!activeAddress?.address || !PUBLIC_EMAIL_WS_URL) return null

    try {
      const base = new URL(PUBLIC_EMAIL_WS_URL)
      const url = new URL(base)

      if (url.protocol === "http:") url.protocol = "ws:"
      if (url.protocol === "https:") url.protocol = "wss:"

      url.searchParams.set("email", activeAddress.address)
      return url.toString()
    } catch {
      return null
    }
  }, [activeAddress?.address])

  useEffect(() => {
    if (!websocketUrl) {
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
              email: payload?.email ?? email,
              message: payload?.message ?? null,
            },
          })
        )
      })
    } catch {
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
