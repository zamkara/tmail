"use client"

import { ReactNode, useEffect, useState } from "react"

import { useIsMobile } from "@/hooks/use-mobile"

export default function DesktopOnly({
  children,
}: {
  children: ReactNode
}) {
  const isMobile = useIsMobile()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || isMobile) return null

  return <>{children}</>
}
