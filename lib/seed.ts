import { connectDB } from "@/lib/db"
import { getAdminSettings } from "@/lib/admin-settings"
import { syncSystemDomainsFromEmailApi } from "@/lib/system-domains"

export async function seedSystemDomains() {
  await connectDB()
  await getAdminSettings()
  await syncSystemDomainsFromEmailApi()
}
