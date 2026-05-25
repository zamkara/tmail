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

interface CopyButtonProps {
  text: string
  className?: string
  label?: string
  successMessage?: string
  errorMessage?: string
}

export default function CopyButton({
  text,
  className,
  label = "Copy address",
  successMessage = "Email address copied",
  errorMessage = "Failed to copy email address",
}: CopyButtonProps) {
  const { copied, copy } = useCopy()

  async function handleCopy() {
    try {
      await copy(text)
      toast.success(successMessage)
    } catch {
      toast.error(errorMessage)
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={className}
          aria-label={label}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            void handleCopy()
          }}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
