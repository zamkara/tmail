import InboxPageContent from "@/components/inbox/inbox-page-content"

export default async function TrashMailPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>
}) {
  const { slug } = await params

  return <InboxPageContent slug={slug} />
}
