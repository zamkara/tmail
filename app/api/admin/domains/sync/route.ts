import { NextResponse } from "next/server"

import { isAdminRequest } from "@/lib/admin-session"
import { connectDB } from "@/lib/db"
import { syncSystemDomainsFromEmailApi } from "@/lib/system-domains"
import { Domain } from "@/models/domain.model"

export async function POST() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await connectDB()

  const synced = await syncSystemDomainsFromEmailApi()
  const domains = await Domain.find({ type: "system" }).sort({ name: 1 }).lean()

  return NextResponse.json({
    synced,
    domains: domains.map((domain) => ({
      id: domain._id.toString(),
      name: domain.name,
      type: domain.type,
      isVerified: domain.isVerified,
      owner: null,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    })),
  })
}
