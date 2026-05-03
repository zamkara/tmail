import InboxEmpty from "@/components/inbox/inbox-empty"

export default function InboxPage() {
  return (
    <div className="flex flex-1 p-4">
      <InboxEmpty
        title="Pilih alamat email"
        description="Pilih atau generate alamat email untuk mulai menerima pesan."
      />
    </div>
  )
}
