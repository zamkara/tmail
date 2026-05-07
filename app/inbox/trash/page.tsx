import InboxEmpty from "@/components/inbox/inbox-empty"

export default function TrashPage() {
  return (
    <div className="flex flex-1 p-4">
      <InboxEmpty
        title="Folder Sampah kosong"
        description="Tidak ada email di folder sampah."
      />
    </div>
  )
}
