import { useCallback, useEffect, useRef, useState } from "react"
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
    <article className="flex flex-col">
      <div className="shrink-0 border-b p-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-normal">
            {email.subject}
          </h1>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <p>
              From <span className="text-foreground">{senderName}</span> &lt;
              {email.from.email}&gt;
            </p>
            <p>{formatFullDate(email.receivedAt)}</p>
          </div>
        </header>
      </div>
      <div className="h-220 overflow-hidden p-6">
        <ScrollArea className="h-full w-full bg-background">
          <div className="airmail-stripe h-4 w-full rounded-b-lg" />
          <div
            ref={containerRef}
            className="w-full border-y dark:border-foreground dark:invert-96"
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
                  className="w-full max-w-158"
                  onLoad={calcScale}
                />
              </div>
            ) : (
              <pre className="rounded-lg bg-muted px-4 font-sans text-sm whitespace-pre-wrap">
                {email.bodyText}
              </pre>
            )}
          </div>
          <div className="airmail-stripe h-4 w-full" />
        </ScrollArea>
      </div>
    </article>
  )
}
