import { Separator } from "@/components/ui/separator"
import type { EmailDetail } from "@/types"

interface EmailPreviewProps {
  email: EmailDetail
}

function formatFullDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value))
}

export default function EmailPreview({ email }: EmailPreviewProps) {
  const senderName = email.from.name ?? email.from.email

  return (
    <article className="flex min-h-0 flex-1 flex-col gap-4 p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-normal">
          {email.subject}
        </h1>
        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          <p>
            Dari <span className="text-foreground">{senderName}</span> &lt;
            {email.from.email}&gt;
          </p>
          <p>{formatFullDate(email.receivedAt)}</p>
        </div>
      </header>
      <Separator />
      {email.bodyHtml ? (
        <iframe
          title={email.subject}
          srcDoc={email.bodyHtml}
          sandbox="allow-same-origin"
          className="min-h-[400px] w-full rounded-lg bg-background"
          style={{ border: "none", minHeight: "400px" }}
        />
      ) : (
        <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 font-sans text-sm">
          {email.bodyText}
        </pre>
      )}
    </article>
  )
}
