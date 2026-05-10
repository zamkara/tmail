import { NextResponse } from "next/server"

import { getAdminSettings } from "@/lib/admin-settings"
import { connectDB } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  await connectDB()
  const settings = await getAdminSettings()

  return NextResponse.json({
    allowGuestAddresses: settings.allowGuestAddresses,
    allowWildcardSubdomains: settings.allowWildcardSubdomains,
    inboxRefreshSeconds: settings.inboxRefreshSeconds,
  })
}
