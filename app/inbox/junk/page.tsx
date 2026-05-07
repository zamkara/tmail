import InboxEmpty from "@/components/inbox/inbox-empty"

export default function JunkPage() {
  return (
    <div className="flex flex-1 p-4">
      <InboxEmpty
        title="Folder Junk kosong"
        description="Tidak ada email yang ditandai sebagai junk."
      />
    </div>
  )
}
