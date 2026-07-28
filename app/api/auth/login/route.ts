import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"

import { AUTH_COOKIE, serializeAuthUser } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { recordUserLogin } from "@/lib/login-audit"
import { signToken } from "@/lib/jwt"
import { verifyTurnstileToken } from "@/lib/turnstile"
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

    const { email, password, turnstileToken } = await req.json()
    const isSecure = new URL(req.url).protocol === "https:"

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password wajib diisi" },
        { status: 400 }
      )
    }

    const turnstile = await verifyTurnstileToken(req, turnstileToken)
    if (!turnstile.ok) {
      return NextResponse.json({ error: turnstile.error }, { status: 400 })
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
    await recordUserLogin(user._id.toString(), req)
    const freshUser = await User.findById(user._id)
    if (!freshUser) {
      throw new Error("User not found after login")
    }

    const res = NextResponse.json({ user: serializeAuthUser(freshUser) })

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
    if (error instanceof Error && error.message.toLowerCase().includes("anti-bot")) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
