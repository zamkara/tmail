import { cookies } from "next/headers"

import GuestHomePage from "@/components/guest/guest-home-page"
import { GUEST_EMAIL_COOKIE } from "@/lib/guest-email"

export default async function HomePage() {
  const cookieStore = await cookies()
  const initialEmail = cookieStore.get(GUEST_EMAIL_COOKIE)?.value

  return <GuestHomePage initialEmail={initialEmail} />
}
