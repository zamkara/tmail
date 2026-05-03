import EmailList from "@/components/inbox/email-list"
import InboxEmpty from "@/components/inbox/inbox-empty"
import { getEmails } from "@/services/mail.service"

interface AddressInboxPageProps {
  params: Promise<{
    addressId: string
  }>
}

export default async function AddressInboxPage({
  params,
}: AddressInboxPageProps) {
  const { addressId } = await params
  const emails = await getEmails(addressId)

  if (emails.length === 0) {
    return (
      <div className="flex flex-1 p-4">
        <InboxEmpty />
      </div>
    )
  }

  return <EmailList emails={emails} />
}
