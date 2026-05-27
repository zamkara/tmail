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
  otp?: string | null
  className?: string
}

function normalizeBackendCode(value: string) {
  return value.trim().toUpperCase()
}

export default function EmailOtpChip({
  otp: backendOtp,
  className,
}: EmailOtpChipProps) {
  const otp = backendOtp ? normalizeBackendCode(backendOtp) : null
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
