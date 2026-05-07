import InboxEmpty from "@/components/inbox/inbox-empty"

export default function TrashPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <InboxEmpty
        title="Trash"
        description="Email yang dihapus akan muncul di sini."
      />
    </div>
  )
}
