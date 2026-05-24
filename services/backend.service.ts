import type {
  Domain,
  DomainSource,
} from "@/types"

const BACKEND_API_BASE = process.env.NEXT_PUBLIC_EMAIL_API_URL?.trim() ?? ""

export interface BackendHealth {
  ok: boolean
  db?: string
  host?: string
  ping?: unknown
  error?: string
}

export interface BackendDomainStatus {
  domain: string
  active: boolean
  approved: boolean
  approved_at: number | null
  uptime_seconds: number
  uptime_days: number
  uptime_label: string | null
  status_label: string
  registered: boolean
  visibility: string | null
  built_in: boolean
  mx_valid: boolean
  required_mx: string
  active_reason: string
  created_at: number | null
  updated_at: number | null
  mx_records?: Array<{ exchange: string; priority: number }>
}

export interface BackendIncomingDomain {
  domain: string
  last_seen_at: number
  total_messages: number
  mx_valid: boolean
}

export interface BackendIncomingDomainsResponse {
  page: number
  limit: number
  total_domains: number
  total_pages: number
  last_page: number
  domains: BackendIncomingDomain[]
}

export interface BackendSystemStatus {
  status: "ok" | "degraded"
  timestamp: number
  app: {
    name: string
    env: string
    pid: number
    uptime_seconds: number
    current_downtime: {
      active: boolean
      seconds: number | null
    }
  }
  host: {
    hostname: string
    platform: string
    arch: string
    release: string
    uptime_seconds: number
  }
  cpu: {
    cores: number
    model: string | null
    load_average: [number, number, number]
    usage_percent: number
    per_core: Array<{ core: number; usage_percent: number }>
  }
  memory: {
    system: {
      total_bytes: number
      used_bytes: number
      free_bytes: number
      total_mb: number
      used_mb: number
      free_mb: number
      usage_percent: number
    }
    process: {
      rss_mb: number
      heap_total_mb: number
      heap_used_mb: number
      external_mb: number
      array_buffers_mb: number
    }
  }
  services: {
    redis: {
      online: boolean
      latency_ms: number
      uptime_seconds?: number
      version?: string | null
      connected_clients?: number
      used_memory_human?: string | null
      used_memory_peak_human?: string | null
      queue?: {
        stream: string
        group: string
        length: number
        first_entry_id: string | null
        last_entry_id: string | null
        groups: unknown[]
      }
      current_downtime?: {
        active: boolean
        seconds: number | null
      }
      error?: string | null
    }
    haraka: {
      online: boolean
      host: string
      port: number
      configured_listen_host: string
      configured_nodes: number
      latency_ms: number
      error?: string | null
      current_downtime?: {
        active: boolean
        seconds: number | null
      }
    }
    api: {
      online: boolean
      port: number
      uptime_seconds: number
    }
    websocket: {
      enabled: boolean
    }
  }
  storage: Record<
    string,
    {
      path: string
      accessible: boolean
      disk: {
        total_mb: number
        used_mb: number
        free_mb: number
        usage_percent: number
      } | null
    }
  >
}

export interface BackendSwaggerSpec {
  openapi: string
  info: {
    title: string
    version: string
    description?: string
  }
  paths: Record<string, unknown>
}

export function getBackendBaseUrl() {
  return BACKEND_API_BASE
}

export function buildBackendUrl(path: string) {
  if (!BACKEND_API_BASE) return null

  try {
    return new URL(path, BACKEND_API_BASE)
  } catch {
    return null
  }
}

export function buildBackendWsUrl(path = "/ws") {
  const base = buildBackendUrl(path)
  if (!base) return null

  const url = new URL(base.toString())
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
  return url.toString()
}

export async function fetchBackendJson<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = buildBackendUrl(path)
  if (!url) {
    throw new Error("Email API tidak dikonfigurasi")
  }

  const res = await fetch(url, {
    cache: "no-store",
    ...init,
  })
  const data = (await res.json().catch(() => null)) as
    | (T & { error?: string })
    | null

  if (!res.ok) {
    throw new Error(data?.error ?? `Request failed with status ${res.status}`)
  }

  if (!data) {
    throw new Error("Empty backend response")
  }

  return data
}

export function isDomainSource(value: unknown): value is DomainSource {
  return value === "system" || value === "user" || value === "guest"
}

export function isSystemDomain(domain: Pick<Domain, "source" | "type">) {
  return domain.source === "system" || domain.type === "system"
}
