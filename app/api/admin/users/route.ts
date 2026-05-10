import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"

import { isAdminRequest } from "@/lib/admin-session"
import { connectDB } from "@/lib/db"
import { User } from "@/models/user.model"

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

export async function POST(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as {
    name?: unknown
    email?: unknown
    password?: unknown
  } | null
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const email = normalizeEmail(body?.email)
  const password = typeof body?.password === "string" ? body.password : ""

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Name, email, and password are required" },
      { status: 400 }
    )
  }

  if (!email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password minimal 8 karakter" },
      { status: 400 }
    )
  }

  await connectDB()

  const existing = await User.findOne({ email })
  if (existing) {
    return NextResponse.json(
      { error: "Email already registered" },
      { status: 409 }
    )
  }

  const user = await User.create({
    name,
    email,
    password: await bcrypt.hash(password, 12),
  })

  return NextResponse.json({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  })
}
