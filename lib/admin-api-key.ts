import crypto from "node:crypto"

import { connectDB, hasMongoConfig } from "@/lib/db"
import { getClientIpAddress } from "@/lib/login-audit"
import { AdminApiKey } from "@/models/admin-api-key.model"

export interface AppAdminApiKey {
  id: string
  name: string
  key: string
  isActive: boolean
  whitelistIps: string[]
  blacklistIps: string[]
  lastUsedAt: string | null
  lastUsedIp: string | null
  useCount: number
  createdAt: string
  updatedAt: string
}

function normalizeIpList(value: unknown) {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/\r?\n|,/)
      : []

  return [...new Set(
    values
      .map((item) => (typeof item === "string" ? item.trim().toLowerCase() : ""))
      .filter(Boolean)
  )].slice(0, 200)
}

export function generateAdminApiKeyValue() {
  return `tmail_admin_${crypto.randomBytes(24).toString("hex")}`
}

export function normalizeAdminApiKeyInput(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

export function normalizeAdminApiKeyPayload(value: unknown) {
  const body = value && typeof value === "object" ? value : {}
  const input = body as {
    name?: unknown
    key?: unknown
    isActive?: unknown
    whitelistIps?: unknown
    blacklistIps?: unknown
  }

  const patch: {
    name?: string
    key?: string
    isActive?: boolean
    whitelistIps?: string[]
    blacklistIps?: string[]
  } = {}

  if ("name" in input) {
    const name = typeof input.name === "string" ? input.name.trim() : ""
    if (name) patch.name = name.slice(0, 120)
  }

  if ("key" in input) {
    const key = normalizeAdminApiKeyInput(input.key)
    if (key) patch.key = key.slice(0, 512)
  }

  if (typeof input.isActive === "boolean") {
    patch.isActive = input.isActive
  }

  if ("whitelistIps" in input) {
    patch.whitelistIps = normalizeIpList(input.whitelistIps)
  }

  if ("blacklistIps" in input) {
    patch.blacklistIps = normalizeIpList(input.blacklistIps)
  }

  return patch
}

export function serializeAdminApiKey(apiKey: {
  _id: { toString(): string }
  name: string
  key: string
  isActive?: boolean
  whitelistIps?: string[]
  blacklistIps?: string[]
  lastUsedAt?: Date | null
  lastUsedIp?: string | null
  useCount?: number
  createdAt: Date
  updatedAt: Date
}): AppAdminApiKey {
  return {
    id: apiKey._id.toString(),
    name: apiKey.name,
    key: apiKey.key,
    isActive: apiKey.isActive ?? true,
    whitelistIps: apiKey.whitelistIps ?? [],
    blacklistIps: apiKey.blacklistIps ?? [],
    lastUsedAt: apiKey.lastUsedAt?.toISOString() ?? null,
    lastUsedIp: apiKey.lastUsedIp ?? null,
    useCount: apiKey.useCount ?? 0,
    createdAt: apiKey.createdAt.toISOString(),
    updatedAt: apiKey.updatedAt.toISOString(),
  }
}

export async function listAdminApiKeys() {
  if (!hasMongoConfig()) return []

  await connectDB()
  const apiKeys = await AdminApiKey.find({}).sort({ createdAt: -1 }).lean()
  return apiKeys.map(serializeAdminApiKey)
}

function extractAdminApiKeyFromRequest(req: Request) {
  const directHeader = normalizeAdminApiKeyInput(
    req.headers.get("x-admin-api-key")
  )
  if (directHeader) return directHeader

  const authorization = req.headers.get("authorization")?.trim() ?? ""
  if (!authorization) return ""

  const [scheme, ...rest] = authorization.split(/\s+/)
  if (!scheme || rest.length === 0) return ""
  if (!/^bearer$/i.test(scheme) && !/^apikey$/i.test(scheme)) return ""

  return normalizeAdminApiKeyInput(rest.join(" "))
}

function isRequestIpAllowed(
  ip: string | null,
  whitelistIps: string[],
  blacklistIps: string[]
) {
  const normalizedIp = ip?.trim().toLowerCase() ?? null
  if (normalizedIp && blacklistIps.includes(normalizedIp)) return false
  if (whitelistIps.length === 0) return true
  if (!normalizedIp) return false

  return whitelistIps.includes(normalizedIp)
}

export async function authenticateAdminApiKey(req: Request) {
  const apiKeyValue = extractAdminApiKeyFromRequest(req)
  if (!apiKeyValue || !hasMongoConfig()) return false

  await connectDB()

  const apiKey = await AdminApiKey.findOne({
    key: apiKeyValue,
    isActive: true,
  })
  if (!apiKey) return false

  const clientIp = getClientIpAddress(req)
  const whitelistIps = normalizeIpList(apiKey.whitelistIps)
  const blacklistIps = normalizeIpList(apiKey.blacklistIps)

  if (!isRequestIpAllowed(clientIp, whitelistIps, blacklistIps)) {
    return false
  }

  apiKey.lastUsedAt = new Date()
  apiKey.lastUsedIp = clientIp
  apiKey.useCount = (apiKey.useCount ?? 0) + 1
  await apiKey.save()

  return true
}
