import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"

import { connectDB } from "@/lib/db"
import { signToken } from "@/lib/jwt"
import { AUTH_COOKIE, serializeAuthUser } from "@/lib/auth"
import {
  assertRateLimit,
  getRequestIdentifier,
  isRateLimitError,
} from "@/lib/rate-limit"
import { User } from "@/models/user.model"

export async function POST(req: Request) {
  try {
    await assertRateLimit({
      action: "auth-register",
      identifier: getRequestIdentifier(req),
      limit: 10,
      windowSeconds: 60,
    })

    const { name, email, password } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Semua field wajib diisi" },
        { status: 400 }
      )
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

    const hashed = await bcrypt.hash(password, 12)
    const user = await User.create({ name, email, password: hashed })

    const token = await signToken({
      userId: user._id.toString(),
      email: user.email,
    })

    const isSecure = new URL(req.url).protocol === "https:"

    const res = NextResponse.json({ user: serializeAuthUser(user) })

    res.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 hari
      path: "/",
    })

    return res
  } catch (err) {
    if (isRateLimitError(err)) {
      return NextResponse.json({ error: err.message }, { status: 429 })
    }

    console.error("[register]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
