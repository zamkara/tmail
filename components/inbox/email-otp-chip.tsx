"use client"

import { CheckIcon, CopyIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useCopy } from "@/hooks/use-copy"
import { cn } from "@/lib/utils"

interface EmailOtpChipProps {
  subject: string
  snippet: string
  className?: string
}

const KEYWORD_CODE_PATTERNS = [
  /\b(?:otp|one[-\s]?time|verification|security|login|auth(?:entication)?|passcode|kode|code|pin)\b(?:\s*(?:is|adalah|:|-)\s*)?\b([a-z0-9](?:[\s-]?[a-z0-9]){3,7})\b/i,
  /\b([a-z0-9](?:[\s-]?[a-z0-9]){3,7})\b(?:\s*(?:is|adalah|:|-)\s*)?\b(?:otp|one[-\s]?time|verification|security|login|auth(?:entication)?|passcode|kode|code|pin)\b/i,
]

function normalizeCode(value: string) {
  return value.replace(/[\s-]/g, "").toUpperCase()
}

function isLikelyOtp(value: string) {
  if (!/^[A-Z0-9]{4,8}$/.test(value)) return false
  if (/^(?:19|20)\d{2}$/.test(value)) return false
  if (/^[A-Z]+$/.test(value)) return false

  return true
}

export function detectOtpCode(subject: string, snippet: string) {
  const text = `${subject}\n${snippet}`

  for (const pattern of KEYWORD_CODE_PATTERNS) {
    const match = text.match(pattern)
    const code = match?.[1] ? normalizeCode(match[1]) : null
    if (code && isLikelyOtp(code)) return code
  }

  const numericCode = text.match(/\b(?!19\d{2}\b|20\d{2}\b)\d{4,8}\b/)?.[0]
  return numericCode && isLikelyOtp(numericCode) ? numericCode : null
}

export default function EmailOtpChip({
  subject,
  snippet,
  className,
}: EmailOtpChipProps) {
  const otp = detectOtpCode(subject, snippet)
  const { copied, copy } = useCopy()

  if (!otp) return null
  const otpCode = otp

  async function handleCopy() {
    try {
      await copy(otpCode)
      toast.success("OTP copied")
    } catch {
      toast.error("Failed to copy OTP")
    }
  }

  return (
    <span className={cn("flex max-w-full items-center gap-1", className)}>
      <span className="font-mono text-sm font-semibold tracking-normal">
        {otpCode}
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="size-5 hover:bg-muted-foreground/10"
            aria-label="Copy OTP"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              void handleCopy()
            }}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Copy OTP</TooltipContent>
      </Tooltip>
    </span>
  )
}
