import mongoose from "mongoose"
import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"

import { isAdminRequest } from "@/lib/admin-session"
import { connectDB } from "@/lib/db"
import { Address } from "@/models/address.model"
import { Domain } from "@/models/domain.model"
import { MailboxState } from "@/models/mailbox-state.model"
import { User } from "@/models/user.model"

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { userId } = await params
  if (!mongoose.isValidObjectId(userId)) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const body = (await req.json().catch(() => null)) as {
    name?: unknown
    email?: unknown
    password?: unknown
    isBanned?: unknown
    banReason?: unknown
  } | null
  const patch: Record<string, unknown> = {}

  if (typeof body?.name === "string" && body.name.trim()) {
    patch.name = body.name.trim()
  }

  if (typeof body?.email === "string") {
    const email = normalizeEmail(body.email)
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 })
    }
    patch.email = email
  }

  if (typeof body?.password === "string" && body.password) {
    if (body.password.length < 8) {
      return NextResponse.json(
        { error: "Password minimal 8 karakter" },
        { status: 400 }
      )
    }

    patch.password = await bcrypt.hash(body.password, 12)
  }

  if (typeof body?.isBanned === "boolean") {
    patch.isBanned = body.isBanned
  }

  if (typeof body?.banReason === "string") {
    patch.banReason = body.banReason
  }

  await connectDB()
  const user = await User.findByIdAndUpdate(userId, patch, {
    returnDocument: "after",
  })
    .select("_id name email createdAt updatedAt")
    .lean()

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  return NextResponse.json({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    isBanned: user.isBanned ?? false,
    banReason: user.banReason ?? "",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { userId } = await params
  if (!mongoose.isValidObjectId(userId)) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  await connectDB()
  const user = await User.findByIdAndDelete(userId)
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  await Promise.all([
    Address.deleteMany({ userId }),
    Domain.deleteMany({ userId }),
    MailboxState.deleteOne({ userId }),
  ])

  return NextResponse.json({ ok: true })
}
