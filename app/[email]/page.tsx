import { redirect } from "next/navigation"

import GuestHomePage from "@/components/guest/guest-home-page"
import { isValidDomain, normalizeDomain } from "@/lib/domain-validation"

function normalizeEmailPath(value: string) {
  const decoded = decodeURIComponent(value).trim().toLowerCase()
  const atIndex = decoded.lastIndexOf("@")
  if (atIndex <= 0) return null

  const localPart = decoded.slice(0, atIndex).trim()
  const domainPart = normalizeDomain(decoded.slice(atIndex + 1))

  if (!localPart || /\s/.test(localPart) || localPart.includes("@")) {
    return null
  }
  if (!domainPart || !isValidDomain(domainPart)) return null

  return `${localPart}@${domainPart}`
}

export default async function EmailShortcutPage({
  params,
}: {
  params: Promise<{ email: string }>
}) {
  const { email } = await params
  const normalizedEmail = normalizeEmailPath(email)

  if (!normalizedEmail) redirect("/")

  return <GuestHomePage initialEmail={normalizedEmail} />
}
