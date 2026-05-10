import * as dns from "node:dns"
import { createRequire } from "node:module"
import mongoose from "mongoose"

const require = createRequire(import.meta.url)
const mutableDns = require("node:dns") as typeof dns

const cached = global as typeof global & {
  mongoose?: {
    conn: typeof mongoose | null
    promise: Promise<typeof mongoose> | null
    dnsConfigured: boolean
    resolveTxtPatched: boolean
  }
}

if (!cached.mongoose) {
  cached.mongoose = {
    conn: null,
    promise: null,
    dnsConfigured: false,
    resolveTxtPatched: false,
  }
}

function patchMongoTxtTimeout() {
  if (cached.mongoose!.resolveTxtPatched) return
  if (process.env.MONGODB_IGNORE_TXT_TIMEOUT === "false") return

  const originalResolveTxt = mutableDns.promises.resolveTxt.bind(
    mutableDns.promises
  )
  const originalCallbackResolveTxt = mutableDns.resolveTxt.bind(mutableDns)

  const shouldIgnoreTxtError = (hostname: string, error: unknown) => {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : ""

    return code === "ETIMEOUT" && hostname.includes("mongodb.net")
  }

  const warnIgnoredTxtTimeout = (hostname: string) => {
    console.warn(
      `MongoDB TXT DNS timeout for ${hostname}; continuing without TXT options.`
    )
  }

  mutableDns.promises.resolveTxt = async (hostname: string) => {
    try {
      return await originalResolveTxt(hostname)
    } catch (error) {
      if (shouldIgnoreTxtError(hostname, error)) {
        warnIgnoredTxtTimeout(hostname)
        return []
      }

      throw error
    }
  }

  mutableDns.resolveTxt = ((
    hostname: string,
    callback: (err: NodeJS.ErrnoException | null, addresses: string[][]) => void
  ) => {
    originalCallbackResolveTxt(hostname, (error, addresses) => {
      if (error && shouldIgnoreTxtError(hostname, error)) {
        warnIgnoredTxtTimeout(hostname)
        callback(null, [])
        return
      }

      callback(error, addresses)
    })
  }) as typeof dns.resolveTxt

  cached.mongoose!.resolveTxtPatched = true
}

function configureMongoDns() {
  if (cached.mongoose!.dnsConfigured) return

  const dnsServers = process.env.MONGODB_DNS_SERVERS?.split(",")
    .map((server) => server.trim())
    .filter(Boolean)

  if (dnsServers?.length) {
    mutableDns.setServers(dnsServers)
  }

  mutableDns.setDefaultResultOrder("ipv4first")
  patchMongoTxtTimeout()
  cached.mongoose!.dnsConfigured = true
}

function getMongoErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return "MongoDB connection failed"

  const code = "code" in error ? String(error.code) : ""
  const message = error.message

  if (code === "ETIMEOUT" || message.includes("ETIMEOUT")) {
    return [
      "MongoDB DNS timeout saat resolve cluster Atlas.",
      "Pastikan koneksi internet/DNS bisa resolve mongodb+srv atau isi MONGODB_DNS_SERVERS di .env.local.",
      `Detail: ${message}`,
    ].join(" ")
  }

  return message
}

async function resolveMongoUri(uri: string) {
  if (!uri.startsWith("mongodb+srv://")) return uri
  if (process.env.MONGODB_USE_SRV === "true") return uri

  const parsed = new URL(uri)
  const srvRecords = await mutableDns.promises.resolveSrv(
    `_mongodb._tcp.${parsed.hostname}`
  )

  if (srvRecords.length === 0) {
    throw new Error(
      `MongoDB SRV record tidak ditemukan untuk ${parsed.hostname}`
    )
  }

  const auth =
    parsed.username || parsed.password
      ? `${parsed.username}:${parsed.password}@`
      : ""
  const hosts = srvRecords
    .map((record) => `${record.name}:${record.port}`)
    .join(",")
  const params = new URLSearchParams(parsed.searchParams)

  params.set("tls", "true")
  if (!params.has("authSource")) params.set("authSource", "admin")

  return `mongodb://${auth}${hosts}${parsed.pathname}?${params.toString()}`
}

export async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URI_DIRECT ?? process.env.MONGODB_URI
  if (!MONGODB_URI) throw new Error("MONGODB_URI tidak ditemukan di .env.local")

  configureMongoDns()

  if (cached.mongoose!.conn) return cached.mongoose!.conn

  if (!cached.mongoose!.promise) {
    cached.mongoose!.promise = resolveMongoUri(MONGODB_URI).then((uri) =>
      mongoose.connect(uri, {
        serverSelectionTimeoutMS: Number(
          process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS ?? 10000
        ),
        connectTimeoutMS: Number(
          process.env.MONGODB_CONNECT_TIMEOUT_MS ?? 10000
        ),
        socketTimeoutMS: Number(process.env.MONGODB_SOCKET_TIMEOUT_MS ?? 20000),
      })
    )
  }

  try {
    cached.mongoose!.conn = await cached.mongoose!.promise
  } catch (error) {
    cached.mongoose!.promise = null
    throw new Error(getMongoErrorMessage(error))
  }

  return cached.mongoose!.conn
}
