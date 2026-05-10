import { NextResponse } from "next/server"

import {
  getAdminSettings,
  normalizeAdminSettingsPatch,
} from "@/lib/admin-settings"
import { isAdminRequest } from "@/lib/admin-session"
import { connectDB } from "@/lib/db"
import { AdminSettings } from "@/models/admin-settings.model"

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await connectDB()
  return NextResponse.json(await getAdminSettings())
}

export async function PATCH(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const patch = normalizeAdminSettingsPatch(await req.json().catch(() => null))

  await connectDB()
  await AdminSettings.findOneAndUpdate(
    { key: "default" },
    { $set: patch, $setOnInsert: { key: "default" } },
    { new: true, upsert: true }
  )

  return NextResponse.json(await getAdminSettings())
}
