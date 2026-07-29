import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"

import { getAuthUser, serializeAuthUser } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { isProfileAvatarPreset } from "@/lib/profile-avatar"
import { User } from "@/models/user.model"

export async function PATCH(req: Request) {
  const auth = await getAuthUser()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { name, email, password, avatarPreset } = await req.json()

  if (!name || !email) {
    return NextResponse.json(
      { error: "Nama dan email wajib diisi" },
      { status: 400 }
    )
  }

  if (avatarPreset && !isProfileAvatarPreset(avatarPreset)) {
    return NextResponse.json(
      { error: "Foto profil tidak valid" },
      { status: 400 }
    )
  }

  if (password && String(password).length < 8) {
    return NextResponse.json(
      { error: "Password minimal 8 karakter" },
      { status: 400 }
    )
  }

  await connectDB()

  const user = await User.findById(auth.userId)
  if (!user) {
    return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 })
  }

  const normalizedEmail = String(email).trim().toLowerCase()
  const emailOwner = await User.findOne({
    email: normalizedEmail,
    _id: { $ne: user._id },
  }).select("_id")

  if (emailOwner) {
    return NextResponse.json(
      { error: "Email already registered" },
      { status: 409 }
    )
  }

  user.name = String(name).trim()
  user.email = normalizedEmail
  user.avatarPreset = avatarPreset ?? null

  if (password) {
    user.password = await bcrypt.hash(String(password), 12)
  }

  await user.save()

  return NextResponse.json({ user: serializeAuthUser(user) })
}
