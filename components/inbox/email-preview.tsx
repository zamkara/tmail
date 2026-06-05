import { useCallback, useEffect, useRef, useState } from "react"
import EmailOtpChip from "@/components/inbox/email-otp-chip"
import type { EmailDetail } from "@/types"
import { ScrollArea } from "../ui/scroll-area"

interface EmailPreviewProps {
  email: EmailDetail
}

function formatFullDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value))
}

export default function EmailPreview({ email }: EmailPreviewProps) {
  const senderName = email.from.name ?? email.from.email
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [scale, setScale] = useState(1)
  const [iframeHeight, setIframeHeight] = useState(0)

  const calcScale = useCallback(() => {
    const iframe = iframeRef.current
    const container = containerRef.current
    if (!iframe || !container) return

    const doc = iframe.contentDocument?.documentElement
    const height = doc?.scrollHeight ?? 0
    const width = doc?.scrollWidth ?? 600
    const containerWidth = container.clientWidth

    iframe.style.height = `${height}px`
    setIframeHeight(height)
    setScale(containerWidth > 0 ? containerWidth / width : 1)
  }, [])

  useEffect(() => {
    window.addEventListener("resize", calcScale)
    return () => window.removeEventListener("resize", calcScale)
  }, [calcScale])

  return (
    <article className="flex min-h-full flex-col bg-background text-foreground">
      <div className="shrink-0 border-b border-border bg-card px-5 py-4 text-card-foreground">
        <header className="flex flex-col gap-1.5">
          <h1 className="text-lg font-semibold tracking-normal">
            {email.subject}
          </h1>
          <EmailOtpChip otp={email.otp} className="w-fit" />
          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
            <p>
              From <span className="text-foreground">{senderName}</span> &lt;
              {email.from.email}&gt;
            </p>
            <p>{formatFullDate(email.receivedAt)}</p>
          </div>
        </header>
      </div>
      <div className="h-[calc(100svh-8.5rem)] overflow-hidden bg-background px-5 py-4">
        <ScrollArea className="h-full w-full bg-background">
          <div className="airmail-stripe mx-auto h-3 w-full max-w-3xl rounded-t-md" />
          <div
            ref={containerRef}
            className="mx-auto w-full max-w-3xl border-y border-border bg-background"
            style={{
              height:
                iframeHeight > 0 ? `${iframeHeight * scale}px` : undefined,
            }}
          >
            {email.bodyHtml ? (
              <div
                style={{
                  transformOrigin: "top left",
                  transform: `scale(${scale})`,
                }}
              >
                <iframe
                  ref={iframeRef}
                  title={email.subject}
                  srcDoc={`<style>html,body{background:transparent!important;margin:0}</style>${email.bodyHtml}`}
                  sandbox="allow-same-origin"
                  className="w-full"
                  onLoad={calcScale}
                />
              </div>
            ) : (
              <pre className="rounded-md bg-input p-4 font-sans text-sm whitespace-pre-wrap text-foreground">
                {email.bodyText}
              </pre>
            )}
          </div>
          <div className="airmail-stripe mx-auto h-3 w-full max-w-3xl rounded-b-md" />
        </ScrollArea>
      </div>
    </article>
  )
}
