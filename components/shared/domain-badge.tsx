import { Badge } from "@/components/ui/badge"
import type { DomainType } from "@/types"

interface DomainBadgeProps {
  type: DomainType
}

export default function DomainBadge({ type }: DomainBadgeProps) {
  return <Badge variant="outline">{type === "system" ? "System" : "Custom"}</Badge>
}
