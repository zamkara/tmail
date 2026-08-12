const PUBLIC_ORIGIN_ENV_KEYS = [
  "APP_URL",
  "NEXT_PUBLIC_APP_URL",
  "SITE_URL",
  "NEXT_PUBLIC_SITE_URL",
  "PUBLIC_URL",
  "NEXTAUTH_URL",
  "VERCEL_URL",
]

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() ?? ""
}

function readEnv(name: string) {
  return process.env[name]?.trim() ?? ""
}

function normalizeOrigin(value: string) {
  if (!value) return ""

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`

  try {
    const url = new URL(withProtocol)
    return url.origin
  } catch {
    return ""
  }
}

function isLocalHost(host: string) {
  const normalized = host.toLowerCase()
  if (normalized === "::1" || normalized.startsWith("[::1]")) return true

  const hostname = normalized.split(":")[0]?.replace(/^\[/, "") ?? ""

  return (
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
  )
}

function parseForwardedHeader(value: string | null) {
  const first = firstHeaderValue(value)
  if (!first) return { host: "", proto: "" }

  const result = { host: "", proto: "" }

  for (const part of first.split(";")) {
    const [rawKey, rawValue] = part.split("=")
    const key = rawKey?.trim().toLowerCase()
    const value = rawValue?.trim().replace(/^"|"$/g, "") ?? ""

    if (key === "host") result.host = value
    if (key === "proto") result.proto = value
  }

  return result
}

export function getConfiguredPublicOrigin() {
  for (const key of PUBLIC_ORIGIN_ENV_KEYS) {
    const origin = normalizeOrigin(readEnv(key))
    if (origin) return origin
  }

  return ""
}

export function getRequestPublicOrigin(req: Request) {
  const requestUrl = new URL(req.url)
  const forwarded = parseForwardedHeader(req.headers.get("forwarded"))
  const forwardedHost =
    firstHeaderValue(req.headers.get("x-forwarded-host")) || forwarded.host
  const forwardedProto =
    firstHeaderValue(req.headers.get("x-forwarded-proto")) || forwarded.proto
  const host = forwardedHost || req.headers.get("host") || requestUrl.host
  const configuredOrigin = getConfiguredPublicOrigin()

  if (host && !isLocalHost(host)) {
    const proto = forwardedProto || "https"

    return normalizeOrigin(`${proto}://${host}`) || configuredOrigin
  }

  if (configuredOrigin) return configuredOrigin

  return requestUrl.origin
}

export function getRequestPublicUrl(req: Request, path: string) {
  return new URL(path, getRequestPublicOrigin(req))
}

export function isSecureRequest(req: Request) {
  return getRequestPublicOrigin(req).startsWith("https://")
}
