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
  title = "Belum ada email",
  description = "Pesan yang masuk ke alamat ini akan tampil di sini.",
}: InboxEmptyProps) {
  return (
    <Empty className="min-h-[360px] border">
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
