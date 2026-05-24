import { Badge } from "@/components/ui/badge"
import type { DomainSource, DomainType } from "@/types"

interface DomainBadgeProps {
  type: DomainType
  source?: DomainSource
}

export default function DomainBadge({ type, source }: DomainBadgeProps) {
  const label =
    type === "system"
      ? "System"
      : source === "guest"
        ? "Guest"
        : source === "user"
          ? "Owned"
          : "Custom"

  return <Badge variant="outline">{label}</Badge>
}
