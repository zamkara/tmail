"use client"

import { InboxIcon, MailOpenIcon, RefreshCwIcon } from "lucide-react"

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import EmailOtpChip from "@/components/inbox/email-otp-chip"
import { formatRelativeInboxTime } from "@/lib/inbox"
import { cn } from "@/lib/utils"
import type { EmailItem, GeneratedAddress } from "@/types"

interface GuestMailListCardProps {
  activeAddress: GeneratedAddress | null
  emails: EmailItem[]
  selectedEmailId: string | null
  isLoading: boolean
  error: string | null
  onRefresh: () => void
  onSelectEmail: (email: EmailItem) => void
}

function getSenderInitial(email: EmailItem) {
  const label = email.from.name ?? email.from.email
  return label.slice(0, 1).toUpperCase()
}

export default function GuestMailListCard({
  activeAddress,
  emails,
  selectedEmailId,
  isLoading,
  error,
  onRefresh,
  onSelectEmail,
}: GuestMailListCardProps) {
  return (
    <Card className="order-first min-h-80 bg-linear-to-b from-card/80 via-card/80 to-card/80 backdrop-blur-lg transition-all duration-500 ease-in-out hover:bg-linear-to-b hover:from-card/80 hover:via-card/80 hover:to-primary/20 lg:order-last lg:h-full lg:min-h-0">
      <CardHeader className="border-b">
        <CardTitle>Inbox</CardTitle>
        <CardAction>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Refresh inbox"
            disabled={!activeAddress || isLoading}
            onClick={onRefresh}
          >
            {isLoading ? <Spinner /> : <RefreshCwIcon />}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 px-0">
        {!activeAddress ? (
          <ListEmpty
            icon={InboxIcon}
            title="No address"
            description="Generate an address first."
          />
        ) : isLoading ? (
          <div className="flex h-full min-h-60 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            <span>Loading emails...</span>
          </div>
        ) : error ? (
          <ListEmpty
            icon={InboxIcon}
            title="Inbox unavailable"
            description={error}
          />
        ) : emails.length === 0 ? (
          <ListEmpty
            icon={InboxIcon}
            title="No emails yet"
            description="Incoming messages will appear here."
          />
        ) : (
          <ScrollArea className="h-full max-h-96 lg:max-h-none">
            <div className="flex flex-col p-2">
              {emails.map((email, index) => (
                <div key={email.id}>
                  <EmailListButton
                    email={email}
                    isSelected={email.id === selectedEmailId}
                    onSelect={() => onSelectEmail(email)}
                  />
                  {index < emails.length - 1 && <Separator className="my-1" />}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

function EmailListButton({
  email,
  isSelected,
  onSelect,
}: {
  email: EmailItem
  isSelected: boolean
  onSelect: () => void
}) {
  const senderName = email.from.name ?? email.from.email

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "flex w-full min-w-0 items-start gap-3 rounded-lg p-3 text-left hover:bg-muted",
        isSelected && "bg-muted"
      )}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onSelect()
        }
      }}
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
        </span>
        <span
          className={cn(
            "max-w-[25ch] truncate text-sm",
            !email.isRead && "font-semibold"
          )}
        >
          {email.subject}
        </span>
        <span className="line-clamp-2 text-sm text-muted-foreground">
          {email.snippet}
        </span>
      </span>
      <span className="flex w-24 shrink-0 flex-col items-end gap-1">
        <span className="text-xs text-muted-foreground">
          {formatRelativeInboxTime(email.receivedAt)}
        </span>
        <EmailOtpChip
          otp={email.otp}
          className="max-w-full"
        />
      </span>
    </div>
  )
}

function ListEmpty({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof InboxIcon | typeof MailOpenIcon
  title: string
  description: string
}) {
  return (
    <Empty className="h-full min-h-60 rounded-none border-0">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
