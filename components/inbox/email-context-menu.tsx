"use client"

import { ShieldAlertIcon, Trash2Icon } from "lucide-react"
import { usePathname } from "next/navigation"
import { toast } from "sonner"

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { getInboxFolderFromPathname } from "@/lib/inbox"
import { useInboxStore } from "@/stores/inbox.store"
import type { EmailItem } from "@/types"

interface EmailContextMenuProps {
  email: EmailItem
  children: React.ReactNode
}

export default function EmailContextMenu({
  email,
  children,
}: EmailContextMenuProps) {
  const pathname = usePathname()
  const trashEmail = useInboxStore((s) => s.trashEmail)
  const markSpam = useInboxStore((s) => s.markSpam)
  const trashedIds = useInboxStore((s) => s.trashedIds)

  const isJunk = getInboxFolderFromPathname(pathname) === "junk"
  const isTrashed = trashedIds.has(email.id)
  const showTrash = !isTrashed
  const showSpam = !isJunk && !isTrashed

  function handleTrash() {
    trashEmail(email.id)
    toast.success("Email dipindahkan ke sampah")
  }

  function handleSpam() {
    markSpam(email.from.email)
    toast.success(`${email.from.email} ditandai sebagai spam`)
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        {showTrash && (
          <ContextMenuItem variant="destructive" onClick={handleTrash}>
            <Trash2Icon data-icon="inline-start" />
            Hapus ke Sampah
          </ContextMenuItem>
        )}
        {showTrash && showSpam && <ContextMenuSeparator />}
        {showSpam && (
          <ContextMenuItem onClick={handleSpam}>
            <ShieldAlertIcon data-icon="inline-start" />
            Tandai sebagai Spam
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
