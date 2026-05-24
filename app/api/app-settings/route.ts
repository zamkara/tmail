import { NextResponse } from "next/server"

import { getAdminSettings } from "@/lib/admin-settings"
import { connectDB, hasMongoConfig } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  if (hasMongoConfig()) {
    await connectDB()
  }

  const settings = await getAdminSettings()

  return NextResponse.json({
    allowGuestAddresses: settings.allowGuestAddresses,
    allowWildcardSubdomains: settings.allowWildcardSubdomains,
    inboxRefreshSeconds: settings.inboxRefreshSeconds,
  })
}
