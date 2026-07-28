import { User } from "@/models/user.model"

const MAX_LOGIN_EVENTS = 10

function firstNonEmpty(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }

  return null
}

function parseForwardedHeader(value: string | null) {
  if (!value) return null

  const match = value.match(/for="?([^;,\s"]+)/i)
  return match?.[1]?.trim() ?? null
}

export function getClientIpAddress(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for")
  const firstForwardedIp = forwardedFor?.split(",")[0]?.trim() ?? null

  return firstNonEmpty(
    firstForwardedIp,
    req.headers.get("cf-connecting-ip"),
    req.headers.get("x-real-ip"),
    req.headers.get("true-client-ip"),
    parseForwardedHeader(req.headers.get("forwarded"))
  )
}

export function getClientUserAgent(req: Request) {
  const userAgent = req.headers.get("user-agent")?.trim()
  if (!userAgent) return null

  return userAgent.slice(0, 512)
}

export async function recordUserLogin(userId: string, req: Request) {
  const at = new Date()
  const ip = getClientIpAddress(req)
  const userAgent = getClientUserAgent(req)

  await User.findByIdAndUpdate(userId, {
    $set: {
      lastLoginAt: at,
      lastLoginIp: ip,
      lastLoginUserAgent: userAgent,
    },
    $push: {
      loginEvents: {
        $each: [{ at, ip, userAgent }],
        $position: 0,
        $slice: MAX_LOGIN_EVENTS,
      },
    },
  })
}
