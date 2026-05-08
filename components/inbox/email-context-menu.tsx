"use client"

import { MailIcon, MailOpenIcon, RotateCcwIcon, ShieldAlertIcon, Trash2Icon } from "lucide-react"
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
  const readIds = useInboxStore((s) => s.readIds)
  const markRead = useInboxStore((s) => s.markRead)
  const unmarkRead = useInboxStore((s) => s.unmarkRead)
  const trashEmail = useInboxStore((s) => s.trashEmail)
  const restoreEmail = useInboxStore((s) => s.restoreEmail)
  const deletePermanently = useInboxStore((s) => s.deletePermanently)
  const markSpam = useInboxStore((s) => s.markSpam)
  const unmarkSpam = useInboxStore((s) => s.unmarkSpam)
  const trashedIds = useInboxStore((s) => s.trashedIds)

  const isRead = readIds.has(email.id)
  const isJunk = getInboxFolderFromPathname(pathname) === "junk"
  const isTrash = getInboxFolderFromPathname(pathname) === "trash"
  const isTrashed = trashedIds.has(email.id)
  const showTrash = !isTrashed
  const showSpamOption = !isJunk && !isTrashed
  const showUnflagSpam = isJunk && !isTrashed
  const showTrashActions = isTrash && isTrashed

  function handleToggleRead() {
    if (isRead) {
      unmarkRead(email.id)
      toast.success("Email marked as unread")
    } else {
      markRead(email.id)
      toast.success("Email marked as read")
    }
  }

  function handleTrash() {
    trashEmail(email.id)
    toast.success("Email moved to trash")
  }

  function handleRestore() {
    restoreEmail(email.id)
    toast.success("Email restored to inbox")
  }

  function handleDeletePermanently() {
    deletePermanently(email.id)
    toast.success("Email permanently deleted")
  }

  function handleSpam() {
    markSpam(email.from.email)
    toast.success(`Flagged ${email.from.email} as spam`)
  }

  function handleUnflagSpam() {
    unmarkSpam(email.from.email)
    toast.success(`Removed spam flag from ${email.from.email}`)
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={handleToggleRead}>
          {isRead ? <MailIcon data-icon="inline-start" /> : <MailOpenIcon data-icon="inline-start" />}
          {isRead ? "Mark as Unread" : "Mark as Read"}
        </ContextMenuItem>
        <ContextMenuSeparator />
        {showUnflagSpam && (
          <ContextMenuItem onClick={handleUnflagSpam}>
            <ShieldAlertIcon data-icon="inline-start" />
            Unflag Spam
          </ContextMenuItem>
        )}
        {showTrashActions && (
          <ContextMenuItem onClick={handleRestore}>
            <RotateCcwIcon data-icon="inline-start" />
            Restore
          </ContextMenuItem>
        )}
        {showTrashActions && (
          <ContextMenuItem variant="destructive" onClick={handleDeletePermanently}>
            <Trash2Icon data-icon="inline-start" />
            Delete Permanently
          </ContextMenuItem>
        )}
        {showTrash && (
          <ContextMenuItem variant="destructive" onClick={handleTrash}>
            <Trash2Icon data-icon="inline-start" />
            Move to Trash
          </ContextMenuItem>
        )}
        {showTrash && showSpamOption && <ContextMenuSeparator />}
        {showSpamOption && (
          <ContextMenuItem onClick={handleSpam}>
            <ShieldAlertIcon data-icon="inline-start" />
            Flag Spam
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
