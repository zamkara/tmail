import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto"
import { NextResponse } from "next/server"

import { getAuthUser, isPremiumActive, serializeAuthUser } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import {
  assertRateLimit,
  getRequestIdentifier,
  isRateLimitError,
} from "@/lib/rate-limit"
import { User } from "@/models/user.model"

type StoredApiKeyFields = {
  apiKeyEncrypted?: string | null
  apiKeyIv?: string | null
  apiKeyAuthTag?: string | null
}

function hashApiKey(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

function createApiKey() {
  const prefix = "tm"
  const body = randomBytes(32).toString("base64url")
  return `${prefix}_${body}`
}

function getEncryptionKey() {
  const secret = process.env.ADMIN_AUTH
  if (!secret) throw new Error("ADMIN_AUTH is required")

  return createHash("sha256").update(secret).digest()
}

function encryptApiKey(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv)
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ])

  return {
    encrypted: encrypted.toString("base64url"),
    iv: iv.toString("base64url"),
    authTag: cipher.getAuthTag().toString("base64url"),
  }
}

function decryptApiKey(input: {
  encrypted?: string | null
  iv?: string | null
  authTag?: string | null
}) {
  if (!input.encrypted || !input.iv || !input.authTag) return null

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(input.iv, "base64url")
  )
  decipher.setAuthTag(Buffer.from(input.authTag, "base64url"))

  return Buffer.concat([
    decipher.update(Buffer.from(input.encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8")
}

function normalizeIpList(value: unknown) {
  if (!Array.isArray(value)) return []

  return [
    ...new Set(
      value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    ),
  ].slice(0, 100)
}

export async function POST(req: Request) {
  try {
    await assertRateLimit({
      action: "api-key-create",
      identifier: getRequestIdentifier(req),
      limit: 10,
      windowSeconds: 60,
    })

    const auth = await getAuthUser()
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectDB()

    const user = await User.findById(auth.userId)
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    if (user.isBanned) {
      return NextResponse.json(
        { error: user.banReason ?? "Account is banned" },
        { status: 403 }
      )
    }
    if (!isPremiumActive(user)) {
      return NextResponse.json(
        { error: "Premium subscription is required" },
        { status: 403 }
      )
    }

    const apiKey = createApiKey()
    const encrypted = encryptApiKey(apiKey)
    const apiKeyPrefix = apiKey.slice(0, 10)
    const apiKeyCreatedAt = new Date()

    await User.collection.updateOne(
      { _id: user._id },
      {
        $set: {
          apiKeyHash: hashApiKey(apiKey),
          apiKeyEncrypted: encrypted.encrypted,
          apiKeyIv: encrypted.iv,
          apiKeyAuthTag: encrypted.authTag,
          apiKeyPrefix,
          apiKeyCreatedAt,
        },
      }
    )

    user.apiKeyPrefix = apiKeyPrefix
    user.apiKeyCreatedAt = apiKeyCreatedAt

    return NextResponse.json({
      apiKey,
      apiKeyPrefix,
      user: serializeAuthUser(user),
    })
  } catch (error) {
    if (isRateLimitError(error)) {
      return NextResponse.json({ error: error.message }, { status: 429 })
    }

    throw error
  }
}

export async function GET() {
  const auth = await getAuthUser()
  if (!auth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await connectDB()

  const user = await User.findById(auth.userId)
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  if (user.isBanned) {
    return NextResponse.json(
      { error: user.banReason ?? "Account is banned" },
      { status: 403 }
    )
  }
  if (!isPremiumActive(user)) {
    return NextResponse.json(
      { error: "Premium subscription is required" },
      { status: 403 }
    )
  }

  const stored = (await User.collection.findOne(
    { _id: user._id },
    {
      projection: {
        apiKeyEncrypted: 1,
        apiKeyIv: 1,
        apiKeyAuthTag: 1,
      },
    }
  )) as StoredApiKeyFields | null

  return NextResponse.json({
    apiKey: decryptApiKey({
      encrypted: stored?.apiKeyEncrypted,
      iv: stored?.apiKeyIv,
      authTag: stored?.apiKeyAuthTag,
    }),
    apiKeyPrefix: user.apiKeyPrefix ?? null,
    user: serializeAuthUser(user),
  })
}

export async function PATCH(req: Request) {
  try {
    const auth = await getAuthUser()
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = (await req.json().catch(() => null)) as {
      allowAllIps?: unknown
      allowedIps?: unknown
      blockedIps?: unknown
    } | null

    await connectDB()

    const user = await User.findById(auth.userId)
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    if (user.isBanned) {
      return NextResponse.json(
        { error: user.banReason ?? "Account is banned" },
        { status: 403 }
      )
    }
    if (!isPremiumActive(user)) {
      return NextResponse.json(
        { error: "Premium subscription is required" },
        { status: 403 }
      )
    }

    user.apiKeyAllowAllIps =
      typeof body?.allowAllIps === "boolean" ? body.allowAllIps : true
    user.apiKeyAllowedIps = normalizeIpList(body?.allowedIps)
    user.apiKeyBlockedIps = normalizeIpList(body?.blockedIps)

    await user.save()

    return NextResponse.json({ user: serializeAuthUser(user) })
  } catch (error) {
    if (isRateLimitError(error)) {
      return NextResponse.json({ error: error.message }, { status: 429 })
    }

    throw error
  }
}
