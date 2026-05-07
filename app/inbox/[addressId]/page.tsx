import InboxEmpty from "@/components/inbox/inbox-empty"

export default function AddressInboxPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <InboxEmpty
        title="Pilih email untuk dibaca"
        description="Klik email di daftar sebelah kiri untuk membacanya."
      />
    </div>
  )
}
