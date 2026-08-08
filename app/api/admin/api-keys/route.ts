import { NextResponse } from "next/server"

import {
  generateAdminApiKeyValue,
  listAdminApiKeys,
  normalizeAdminApiKeyPayload,
  serializeAdminApiKey,
} from "@/lib/admin-api-key"
import { isAdminRequest } from "@/lib/admin-session"
import { connectDB, hasMongoConfig } from "@/lib/db"
import { AdminApiKey } from "@/models/admin-api-key.model"

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json(await listAdminApiKeys())
}

export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!hasMongoConfig()) {
    return NextResponse.json(
      { error: "MongoDB is required for admin API keys" },
      { status: 503 }
    )
  }

  const payload = normalizeAdminApiKeyPayload(await req.json().catch(() => null))
  if (!payload.name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  await connectDB()

  const apiKey = await AdminApiKey.create({
    name: payload.name,
    key: payload.key ?? generateAdminApiKeyValue(),
    isActive: payload.isActive ?? true,
    whitelistIps: payload.whitelistIps ?? [],
    blacklistIps: payload.blacklistIps ?? [],
  }).catch((error: { code?: number }) => {
    if (error?.code === 11000) return null
    throw error
  })

  if (!apiKey) {
    return NextResponse.json(
      { error: "API key value already exists" },
      { status: 409 }
    )
  }

  return NextResponse.json(serializeAdminApiKey(apiKey.toObject()), {
    status: 201,
  })
}
