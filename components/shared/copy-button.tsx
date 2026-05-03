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
}

export default function CopyButton({ text }: CopyButtonProps) {
  const { copied, copy } = useCopy()

  async function handleCopy() {
    try {
      await copy(text)
      toast.success("Alamat email disalin")
    } catch {
      toast.error("Gagal menyalin alamat email")
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Salin alamat"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            void handleCopy()
          }}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Salin alamat</TooltipContent>
    </Tooltip>
  )
}
