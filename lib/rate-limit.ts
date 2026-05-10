import { connectDB } from "@/lib/db"
import { RateLimit } from "@/models/rate-limit.model"

interface RateLimitOptions {
  action: string
  identifier: string
  limit: number
  windowSeconds: number
}

export async function assertRateLimit({
  action,
  identifier,
  limit,
  windowSeconds,
}: RateLimitOptions) {
  await connectDB()

  const key = `${action}:${identifier}`
  const now = new Date()
  const expiresAt = new Date(now.getTime() + windowSeconds * 1000)

  const current = await RateLimit.findOne({ key })

  if (!current || current.expiresAt <= now) {
    await RateLimit.findOneAndUpdate(
      { key },
      { key, count: 1, expiresAt },
      { upsert: true }
    )
    return
  }

  if (current.count >= limit) {
    const retryAfter = Math.max(
      1,
      Math.ceil((current.expiresAt.getTime() - now.getTime()) / 1000)
    )
    const error = new Error(`Rate limit exceeded. Try again in ${retryAfter}s.`)
    error.name = "RateLimitError"
    throw error
  }

  current.count += 1
  await current.save()
}

export function getRequestIdentifier(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  )
}

export function isRateLimitError(error: unknown): error is Error {
  return error instanceof Error && error.name === "RateLimitError"
}
