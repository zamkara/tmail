import { NextResponse } from "next/server"

import { isAdminRequest } from "@/lib/admin-session"
import { connectDB } from "@/lib/db"
import { isValidDomain, normalizeDomain } from "@/lib/domain-validation"
import { Domain } from "@/models/domain.model"

export async function POST(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as {
    name?: unknown
    type?: unknown
    isVerified?: unknown
    visibility?: unknown
    privateUntil?: unknown
  } | null
  const name = normalizeDomain(body?.name)
  const type = body?.type === "custom" ? "custom" : "system"

  if (!name || !isValidDomain(name)) {
    return NextResponse.json({ error: "Invalid domain" }, { status: 400 })
  }

  await connectDB()

  const domain = await Domain.create({
    name,
    type,
    isVerified: typeof body?.isVerified === "boolean" ? body.isVerified : true,
    visibility: body?.visibility === "private" ? "private" : "public",
    privateUntil:
      typeof body?.privateUntil === "string" && body.privateUntil
        ? new Date(body.privateUntil)
        : null,
    userId: null,
  })

  return NextResponse.json({
    id: domain._id.toString(),
    name: domain.name,
    type: domain.type,
    isVerified: domain.isVerified,
    visibility: domain.visibility,
    privateUntil: domain.privateUntil,
    isBanned: domain.isBanned ?? false,
    banReason: domain.banReason ?? "",
    owner: null,
    createdAt: domain.createdAt,
    updatedAt: domain.updatedAt,
  })
}
