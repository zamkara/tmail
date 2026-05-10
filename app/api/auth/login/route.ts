import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"

import { AUTH_COOKIE } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { signToken } from "@/lib/jwt"
import {
  assertRateLimit,
  getRequestIdentifier,
  isRateLimitError,
} from "@/lib/rate-limit"
import { User } from "@/models/user.model"

export async function POST(req: Request) {
  try {
    await assertRateLimit({
      action: "auth-login",
      identifier: getRequestIdentifier(req),
      limit: 20,
      windowSeconds: 60,
    })

    const { email, password } = await req.json()
    const isSecure = new URL(req.url).protocol === "https:"

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password wajib diisi" },
        { status: 400 }
      )
    }

    await connectDB()

    const user = await User.findOne({ email })
    if (!user) {
      return NextResponse.json(
        { error: "Email atau password salah" },
        { status: 401 }
      )
    }

    if (user.isBanned) {
      return NextResponse.json(
        { error: user.banReason ?? "Account is banned" },
        { status: 403 }
      )
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return NextResponse.json(
        { error: "Email atau password salah" },
        { status: 401 }
      )
    }

    const token = await signToken({
      userId: user._id.toString(),
      email: user.email,
    })

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
  } catch (error) {
    if (isRateLimitError(error)) {
      return NextResponse.json({ error: error.message }, { status: 429 })
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
