import { InboxIcon } from "lucide-react"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

interface InboxEmptyProps {
  title?: string
  description?: string
}

export default function InboxEmpty({
  title = "No emails yet",
  description = "Messages received at this address will appear here.",
}: InboxEmptyProps) {
  return (
    <Empty className="min-h-[360px] border border-border bg-card text-card-foreground">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <InboxIcon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
