import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"

import { AUTH_COOKIE } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { signToken } from "@/lib/jwt"
import { User } from "@/models/user.model"

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()
    const isSecure = new URL(req.url).protocol === "https:"

    if (!email || !password) {
      return NextResponse.json({ error: "Email dan password wajib diisi" }, { status: 400 })
    }

    await connectDB()

    const user = await User.findOne({ email })
    if (!user) {
      return NextResponse.json({ error: "Email atau password salah" }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return NextResponse.json({ error: "Email atau password salah" }, { status: 401 })
    }

    const token = await signToken({ userId: user._id.toString(), email: user.email })

    const res = NextResponse.json({
      user: { id: user._id.toString(), name: user.name, email: user.email },
    })

    res.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    })

    return res
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
