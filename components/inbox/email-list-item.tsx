import Link from "next/link"

import EmailContextMenu from "@/components/inbox/email-context-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { EmailItem } from "@/types"
import { cn } from "@/lib/utils"

interface EmailListItemProps {
  email: EmailItem
}

function getSenderInitial(email: EmailItem) {
  const label = email.from.name ?? email.from.email
  return label.slice(0, 1).toUpperCase()
}

function formatRelativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) {
    return "Baru saja"
  }

  if (minutes < 60) {
    return `${minutes}m lalu`
  }

  if (hours < 24) {
    return `${hours}j lalu`
  }

  if (days === 1) {
    return "Kemarin"
  }

  return `${days}h lalu`
}

export default function EmailListItem({ email }: EmailListItemProps) {
  const senderName = email.from.name ?? email.from.email

  return (
    <EmailContextMenu email={email}>
      <Link
        href={`/inbox/${email.addressId}/${email.id}`}
        className="flex min-w-0 items-start gap-3 rounded-lg p-3 hover:bg-muted"
      >
        <Avatar>
          <AvatarFallback>{getSenderInitial(email)}</AvatarFallback>
        </Avatar>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex min-w-0 items-center gap-2">
            {!email.isRead && (
              <span className="size-2 rounded-full bg-primary" aria-hidden />
            )}
            <span className="truncate text-sm font-medium">{senderName}</span>
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
              {formatRelativeTime(email.receivedAt)}
            </span>
          </span>
          <span
            className={cn(
              "truncate text-sm",
              !email.isRead && "font-semibold"
            )}
          >
            {email.subject}
          </span>
          <span className="line-clamp-2 text-sm text-muted-foreground">
            {email.snippet}
          </span>
        </span>
      </Link>
    </EmailContextMenu>
  )
}
