"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export function useCopy(timeout = 2000) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<number | null>(null)

  const copy = useCallback(
    async (text: string) => {
      await navigator.clipboard.writeText(text)
      setCopied(true)

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = window.setTimeout(() => setCopied(false), timeout)
    },
    [timeout]
  )

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return { copied, copy }
}
