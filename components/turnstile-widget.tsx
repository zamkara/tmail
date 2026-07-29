"use client"

import Script from "next/script"
import { useCallback, useEffect, useRef, useState } from "react"

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string
          callback?: (token: string) => void
          "expired-callback"?: () => void
          "error-callback"?: () => void
          theme?: "light" | "dark" | "auto"
        }
      ) => string
      reset: (widgetId?: string) => void
      remove: (widgetId?: string) => void
    }
  }
}

export default function TurnstileWidget({
  onTokenChange,
  resetKey = 0,
  onWidgetStateChange,
}: {
  onTokenChange: (token: string) => void
  resetKey?: number
  onWidgetStateChange?: (state: "idle" | "loading" | "ready" | "error") => void
}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? ""
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [scriptLoaded, setScriptLoaded] = useState(
    typeof window !== "undefined" && Boolean(window.turnstile?.render)
  )
  const [retryNonce, setRetryNonce] = useState(0)
  const [widgetState, setWidgetState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle")
  const widgetIdRef = useRef<string | null>(null)
  const renderAttemptRef = useRef(0)

  const setState = useCallback(
    (state: "idle" | "loading" | "ready" | "error") => {
      setWidgetState(state)
      onWidgetStateChange?.(state)
    },
    [onWidgetStateChange]
  )

  const cleanupWidget = useCallback(() => {
    if (widgetIdRef.current) {
      window.turnstile?.remove(widgetIdRef.current)
      widgetIdRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!siteKey || !scriptLoaded) return

    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    renderAttemptRef.current = 0
    onTokenChange("")
    setState("loading")

    const renderWidget = () => {
      if (cancelled) return

      const mountElement = containerRef.current
      if (!mountElement) {
        retryTimer = setTimeout(renderWidget, 100)
        return
      }

      if (!window.turnstile?.render) {
        renderAttemptRef.current += 1
        if (renderAttemptRef.current >= 20) {
          setState("error")
          return
        }
        retryTimer = setTimeout(renderWidget, 250)
        return
      }

      cleanupWidget()
      mountElement.innerHTML = ""

      try {
        const widgetId = window.turnstile.render(mountElement, {
          sitekey: siteKey,
          theme: "auto",
          callback: (token) => {
            if (cancelled) return
            onTokenChange(token)
            setState("ready")
          },
          "expired-callback": () => {
            if (cancelled) return
            onTokenChange("")
            window.turnstile?.reset(widgetIdRef.current ?? undefined)
            setState("idle")
          },
          "error-callback": () => {
            if (cancelled) return
            onTokenChange("")
            setState("error")
          },
        })

        widgetIdRef.current = widgetId
        setState("idle")
      } catch {
        setState("error")
      }
    }

    renderWidget()

    return () => {
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
      cleanupWidget()
    }
  }, [cleanupWidget, onTokenChange, retryNonce, scriptLoaded, setState, siteKey])

  useEffect(() => {
    onTokenChange("")
    setRetryNonce((current) => current + 1)
  }, [onTokenChange, resetKey])

  if (!siteKey) return null

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
        onError={() => setState("error")}
      />
      <div className="space-y-2">
        <div ref={containerRef} className="min-h-16" />
        {widgetState === "error" ? (
          <button
            type="button"
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            onClick={() => {
              onTokenChange("")
              setRetryNonce((current) => current + 1)
              setState("loading")
            }}
          >
            Cloudflare verification did not load. Reload widget
          </button>
        ) : null}
      </div>
    </>
  )
}
