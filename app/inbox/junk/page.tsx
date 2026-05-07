import InboxEmpty from "@/components/inbox/inbox-empty"

export default function JunkPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <InboxEmpty
        title="Junk"
        description="Email dari pengirim yang ditandai spam akan muncul di sini."
      />
    </div>
  )
}
