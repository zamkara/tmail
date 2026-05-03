import EmailListItem from "@/components/inbox/email-list-item"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import type { EmailItem } from "@/types"

interface EmailListProps {
  emails: EmailItem[]
}

export default function EmailList({ emails }: EmailListProps) {
  return (
    <ScrollArea className="h-[calc(100svh-5rem)]">
      <div className="flex flex-col p-3">
        {emails.map((email, index) => (
          <div key={email.id}>
            <EmailListItem email={email} />
            {index < emails.length - 1 && <Separator className="my-1" />}
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
