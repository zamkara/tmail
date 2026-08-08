import { redirect } from "next/navigation"

import {
  normalizeGuestEmail,
} from "@/lib/guest-email"

export default async function EmailShortcutPage({
  params,
}: {
  params: Promise<{ email: string }>
}) {
  const { email } = await params
  const normalizedEmail = normalizeGuestEmail(email)
  const target = `/api/guest-email-context?email=${encodeURIComponent(
    normalizedEmail ?? decodeURIComponent(email)
  )}`

  redirect(target)
}
