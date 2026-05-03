import EmailPreview from "@/components/inbox/email-preview"
import { getEmailDetail } from "@/services/mail.service"

interface MailPreviewPageProps {
  params: Promise<{
    addressId: string
    mailId: string
  }>
}

export default async function MailPreviewPage({
  params,
}: MailPreviewPageProps) {
  const { addressId, mailId } = await params
  const email = await getEmailDetail(addressId, mailId)

  return <EmailPreview email={email} />
}
