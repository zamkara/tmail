import mongoose from "mongoose"
import { NextResponse } from "next/server"

import {
  normalizeAdminApiKeyPayload,
  serializeAdminApiKey,
} from "@/lib/admin-api-key"
import { isAdminRequest } from "@/lib/admin-session"
import { connectDB, hasMongoConfig } from "@/lib/db"
import { AdminApiKey } from "@/models/admin-api-key.model"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ keyId: string }> }
) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!hasMongoConfig()) {
    return NextResponse.json(
      { error: "MongoDB is required for admin API keys" },
      { status: 503 }
    )
  }

  const { keyId } = await params
  if (!mongoose.isValidObjectId(keyId)) {
    return NextResponse.json({ error: "Invalid API key id" }, { status: 400 })
  }

  const payload = normalizeAdminApiKeyPayload(await req.json().catch(() => null))
  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 })
  }

  await connectDB()

  const apiKey = await AdminApiKey.findByIdAndUpdate(
    keyId,
    { $set: payload },
    { new: true, runValidators: true }
  ).catch((error: { code?: number }) => {
    if (error?.code === 11000) return "duplicate"
    throw error
  })

  if (apiKey === "duplicate") {
    return NextResponse.json(
      { error: "API key value already exists" },
      { status: 409 }
    )
  }

  if (!apiKey) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 })
  }

  return NextResponse.json(serializeAdminApiKey(apiKey.toObject()))
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ keyId: string }> }
) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!hasMongoConfig()) {
    return NextResponse.json(
      { error: "MongoDB is required for admin API keys" },
      { status: 503 }
    )
  }

  const { keyId } = await params
  if (!mongoose.isValidObjectId(keyId)) {
    return NextResponse.json({ error: "Invalid API key id" }, { status: 400 })
  }

  await connectDB()
  const deleted = await AdminApiKey.findByIdAndDelete(keyId)

  if (!deleted) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
