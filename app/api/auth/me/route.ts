import { NextResponse } from "next/server"

import { getAuthUser, serializeAuthUser } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { User } from "@/models/user.model"

export async function GET() {
  const auth = await getAuthUser()
  if (!auth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await connectDB()
  const user = await User.findById(auth.userId).select("-password")
  if (!user)
    return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 })
  if (user.isBanned) {
    return NextResponse.json(
      { error: user.banReason ?? "Account is banned" },
      { status: 403 }
    )
  }

  return NextResponse.json({ user: serializeAuthUser(user) })
}
