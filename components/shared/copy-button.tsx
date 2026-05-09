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
}

export default function CopyButton({ text, className }: CopyButtonProps) {
  const { copied, copy } = useCopy()

  async function handleCopy() {
    try {
      await copy(text)
      toast.success("Email address copied")
    } catch {
      toast.error("Failed to copy email address")
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
          aria-label="Copy address"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            void handleCopy()
          }}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Copy address</TooltipContent>
    </Tooltip>
  )
}
