import { NextResponse } from "next/server"

import { isAdminRequest } from "@/lib/admin-session"
import { connectDB } from "@/lib/db"
import { Address } from "@/models/address.model"
import { Domain } from "@/models/domain.model"
import { User } from "@/models/user.model"

function normalizeAddress(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

export async function POST(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as {
    address?: unknown
    userId?: unknown
    domainId?: unknown
    expiresAt?: unknown
  } | null
  const address = normalizeAddress(body?.address)
  const userId = typeof body?.userId === "string" ? body.userId : ""
  const domainId = typeof body?.domainId === "string" ? body.domainId : ""
  const expiresAt =
    typeof body?.expiresAt === "string" ? new Date(body.expiresAt) : null

  if (
    !address ||
    !address.includes("@") ||
    !userId ||
    !domainId ||
    !expiresAt
  ) {
    return NextResponse.json(
      { error: "Address, user, domain, and expiry are required" },
      { status: 400 }
    )
  }

  if (Number.isNaN(expiresAt.getTime())) {
    return NextResponse.json({ error: "Invalid expiry date" }, { status: 400 })
  }

  await connectDB()

  const [user, domain] = await Promise.all([
    User.findById(userId).lean(),
    Domain.findById(domainId).lean(),
  ])

  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  if (!domain)
    return NextResponse.json({ error: "Domain not found" }, { status: 404 })

  const addressDomain = address.split("@")[1]
  if (addressDomain !== domain.name) {
    return NextResponse.json(
      { error: `Address must use ${domain.name}` },
      { status: 400 }
    )
  }

  const created = await Address.create({
    address,
    userId,
    domainId,
    expiresAt,
  })

  return NextResponse.json({
    id: created._id.toString(),
    address: created.address,
    userId: created.userId.toString(),
    domainId: created.domainId.toString(),
    expiresAt: created.expiresAt,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  })
}
