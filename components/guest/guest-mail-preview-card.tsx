"use client"

import { InboxIcon, MailOpenIcon } from "lucide-react"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import CopyButton from "@/components/shared/copy-button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import type { EmailDetail, GeneratedAddress } from "@/types"

interface GuestMailPreviewCardProps {
  activeAddress: GeneratedAddress | null
  email: EmailDetail | null
  isLoading: boolean
  error: string | null
}

function formatFullDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value))
}

export default function GuestMailPreviewCard({
  activeAddress,
  email,
  isLoading,
  error,
}: GuestMailPreviewCardProps) {
  const senderName = email?.from.name ?? email?.from.email

  return (
    <Card className="min-h-130 bg-card/80 lg:h-full lg:min-h-0">
      <CardHeader className="border-b">
        <CardTitle className="truncate">
          {email?.subject ?? "Paper mail"}
        </CardTitle>
        {email && senderName && (
          <CardDescription className="truncate">
            {senderName} &lt;{email.from.email}&gt;
          </CardDescription>
        )}
        {activeAddress && (
          <CardAction className="flex max-w-64 min-w-0 items-center gap-1">
            <span className="truncate text-sm text-muted-foreground">
              {activeAddress.address}
            </span>
            <CopyButton text={activeAddress.address} />
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="min-h-0 flex-1 px-0">
        {!activeAddress ? (
          <PreviewEmpty
            icon={InboxIcon}
            title="No address"
            description="Generate an address to receive email."
          />
        ) : isLoading ? (
          <div className="flex h-full min-h-96 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            <span>Loading email...</span>
          </div>
        ) : error ? (
          <PreviewEmpty
            icon={MailOpenIcon}
            title="Email unavailable"
            description={error}
          />
        ) : !email ? (
          <PreviewEmpty
            icon={MailOpenIcon}
            title="No email selected"
            description="Select an email from the list."
          />
        ) : (
          <ScrollArea className="h-full">
            <article className="flex min-h-full flex-col">
              <div className="border-b px-6 py-5">
                <div className="flex flex-col gap-2">
                  <h1 className="text-2xl font-semibold tracking-normal">
                    {email.subject}
                  </h1>
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <p>
                      From <span className="text-foreground">{senderName}</span>{" "}
                      &lt;{email.from.email}&gt;
                    </p>
                    <p>{formatFullDate(email.receivedAt)}</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 p-6">
                <div className="airmail-stripe h-4 w-full rounded-t-lg" />
                <div className="min-h-96 border-y bg-background">
                  {email.bodyHtml ? (
                    <iframe
                      title={email.subject}
                      srcDoc={`<style>html,body{background:transparent!important;margin:0}</style>${email.bodyHtml}`}
                      sandbox="allow-same-origin"
                      className="h-160 w-full bg-background"
                    />
                  ) : (
                    <pre className="min-h-96 p-4 font-sans text-sm whitespace-pre-wrap">
                      {email.bodyText}
                    </pre>
                  )}
                </div>
                <div className="airmail-stripe h-4 w-full rounded-b-lg" />
              </div>
            </article>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

function PreviewEmpty({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof InboxIcon | typeof MailOpenIcon
  title: string
  description: string
}) {
  return (
    <Empty className="h-full min-h-96 rounded-none border-0">
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
