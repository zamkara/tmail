"use client"

import { Badge } from "@/components/ui/badge"
import { useCountdown } from "@/hooks/use-countdown"

interface CountdownBadgeProps {
  expiresAt: string
}

export default function CountdownBadge({ expiresAt }: CountdownBadgeProps) {
  const countdown = useCountdown(expiresAt)
  const isCritical = !countdown.isExpired && countdown.hours < 2

  return (
    <Badge
      variant={countdown.isExpired || isCritical ? "destructive" : "secondary"}
    >
      {countdown.formatted}
    </Badge>
  )
}
