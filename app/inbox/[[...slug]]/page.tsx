import InboxEmpty from "@/components/inbox/inbox-empty"

export default function InboxPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>
}) {
  // For non-empty paths, show a placeholder.
  // The actual email/email list content is rendered client-side
  // by the layout and inbox components.
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <InboxEmpty
        title="Memuat..."
        description="Pilih alamat email untuk melihat inbox."
      />
    </div>
  )
}
