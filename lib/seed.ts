import { connectDB, hasMongoConfig } from "@/lib/db"
import { getAdminSettings } from "@/lib/admin-settings"
import { syncSystemDomainsFromEmailApi } from "@/lib/system-domains"

export async function seedSystemDomains() {
  if (!hasMongoConfig()) return

  await connectDB()
  await getAdminSettings()
  await syncSystemDomainsFromEmailApi()
}
