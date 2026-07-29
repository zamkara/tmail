import { redirect } from "next/navigation"

import BackendConsolePage from "@/components/admin/backend-console-page"
import { isAdminRequest } from "@/lib/admin-session"

export default async function DashboardPage() {
  const isAdmin = await isAdminRequest()

  if (!isAdmin) {
    redirect("/")
  }

  return <BackendConsolePage />
}
