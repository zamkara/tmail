"use client"

import { useEffect, useState } from "react"

interface CountdownResult {
  hours: number
  minutes: number
  seconds: number
  isExpired: boolean
  formatted: string
}

function getRemaining(expiresAt: string): CountdownResult {
  const diff = new Date(expiresAt).getTime() - Date.now()

  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, isExpired: true, formatted: "Kedaluwarsa" }
  }

  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)

  return {
    hours,
    minutes,
    seconds,
    isExpired: false,
    formatted: `${hours}j ${minutes}m`,
  }
}

export function useCountdown(expiresAt: string): CountdownResult {
  const [state, setState] = useState(() => getRemaining(expiresAt))

  useEffect(() => {
    const interval = window.setInterval(() => {
      setState(getRemaining(expiresAt))
    }, 1000)

    return () => window.clearInterval(interval)
  }, [expiresAt])

  return state
}
