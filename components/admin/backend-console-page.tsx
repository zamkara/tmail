"use client"

import { useEffect, useMemo, useState } from "react"
import {
  BookOpenIcon,
  GlobeIcon,
  Link2Icon,
  Loader2Icon,
  RadarIcon,
  RefreshCwIcon,
  ServerIcon,
  ShieldAlertIcon,
  Trash2Icon,
  WebhookIcon,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  BackendDomainStatus,
  BackendHealth,
  BackendIncomingDomainsResponse,
  BackendSwaggerSpec,
  BackendSystemStatus,
  buildBackendUrl,
  fetchBackendJson,
  getBackendBaseUrl,
} from "@/services/backend.service"

type SessionState = "checking" | "guest" | "admin"

function formatDateTime(value: number | string | null | undefined) {
  if (value === null || value === undefined) return "n/a"
  const date = typeof value === "number" ? new Date(value) : new Date(value)
  if (Number.isNaN(date.getTime())) return "n/a"
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined) return "n/a"
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

function hostFromBaseUrl(baseUrl: string) {
  try {
    return new URL(baseUrl).host
  } catch {
    return baseUrl
  }
}

export default function BackendConsolePage() {
  const [sessionState, setSessionState] = useState<SessionState>("checking")
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [health, setHealth] = useState<BackendHealth | null>(null)
  const [healthError, setHealthError] = useState<string | null>(null)
  const [systemStatus, setSystemStatus] = useState<BackendSystemStatus | null>(
    null
  )
  const [systemStatusError, setSystemStatusError] = useState<string | null>(
    null
  )
  const [swagger, setSwagger] = useState<BackendSwaggerSpec | null>(null)
  const [swaggerError, setSwaggerError] = useState<string | null>(null)
  const [incoming, setIncoming] =
    useState<BackendIncomingDomainsResponse | null>(null)
  const [incomingError, setIncomingError] = useState<string | null>(null)
  const [incomingPage, setIncomingPage] = useState(1)
  const [incomingLoading, setIncomingLoading] = useState(false)
  const [domainQuery, setDomainQuery] = useState("")
  const [domainStatus, setDomainStatus] = useState<BackendDomainStatus | null>(
    null
  )
  const [domainStatusError, setDomainStatusError] = useState<string | null>(
    null
  )
  const [domainStatusLoading, setDomainStatusLoading] = useState(false)
  const [purgeEmail, setPurgeEmail] = useState("")
  const [purgeDomain, setPurgeDomain] = useState("")
  const [purgeMessageId, setPurgeMessageId] = useState("")
  const [purgeLoading, setPurgeLoading] = useState(false)

  const backendBaseUrl = getBackendBaseUrl()
  const swaggerUrl = useMemo(() => buildBackendUrl("/swagger"), [])
  const websocketUrl = useMemo(() => buildBackendUrl("/ws"), [])

  useEffect(() => {
    let cancelled = false

    async function loadSession() {
      try {
        const res = await fetch("/api/admin/session", { cache: "no-store" })
        const data = (await res.json()) as { authenticated?: boolean }
        if (!cancelled) {
          setSessionState(data.authenticated ? "admin" : "guest")
        }
      } catch (error) {
        if (!cancelled) {
          setSessionState("guest")
          setSessionError(
            error instanceof Error ? error.message : "Failed to check session"
          )
        }
      }
    }

    void loadSession()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadPublicBackendData() {
      try {
        const data = await fetchBackendJson<BackendHealth>("/health")
        if (!cancelled) {
          setHealth(data)
          setHealthError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setHealth(null)
          setHealthError(
            error instanceof Error ? error.message : "Failed to load backend health"
          )
        }
      }

      try {
        const [swaggerData, incomingData] = await Promise.all([
          fetchBackendJson<BackendSwaggerSpec>("/swagger.json"),
          fetchBackendJson<BackendIncomingDomainsResponse>(
            `/list-domain?page=${incomingPage}&limit=20`
          ),
        ])

        if (!cancelled) {
          setSwagger(swaggerData)
          setSwaggerError(null)
          setIncoming(incomingData)
          setIncomingError(null)
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : "Failed to load backend data"
          setSwaggerError(message)
          setIncomingError(message)
        }
      }
    }

    void loadPublicBackendData()

    return () => {
      cancelled = true
    }
  }, [incomingPage])

  useEffect(() => {
    let cancelled = false

    async function loadSystemStatus() {
      try {
        const data = (await fetch("/api/backend/system-status", {
          cache: "no-store",
        }).then((res) => res.json())) as BackendSystemStatus & { error?: string }

        if (!cancelled) {
          if ("error" in data) {
            throw new Error(data.error)
          }
          setSystemStatus(data)
          setSystemStatusError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setSystemStatus(null)
          setSystemStatusError(
            error instanceof Error
              ? error.message
              : "Failed to load system status"
          )
        }
      }
    }

    void loadSystemStatus()

    return () => {
      cancelled = true
    }
  }, [])

  async function refreshAll() {
    setIncomingLoading(true)
    try {
      const [healthData, swaggerData, incomingData] = await Promise.all([
        fetchBackendJson<BackendHealth>("/health"),
        fetchBackendJson<BackendSwaggerSpec>("/swagger.json"),
        fetchBackendJson<BackendIncomingDomainsResponse>(
          `/list-domain?page=${incomingPage}&limit=20`
        ),
      ])
      setHealth(healthData)
      setSwagger(swaggerData)
      setIncoming(incomingData)
      setHealthError(null)
      setSwaggerError(null)
      setIncomingError(null)
      toast.success("Backend data refreshed")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to refresh backend data"
      )
    } finally {
      setIncomingLoading(false)
    }
  }

  async function lookupDomain() {
    const normalized = domainQuery.trim().toLowerCase()
    if (!normalized) {
      setDomainStatusError("Enter a domain to inspect")
      setDomainStatus(null)
      return
    }

    setDomainStatusLoading(true)
    setDomainStatusError(null)
    try {
      const data = await fetchBackendJson<BackendDomainStatus>(
        `/domains/status?domain=${encodeURIComponent(normalized)}`
      )
      setDomainStatus(data)
    } catch (error) {
      setDomainStatus(null)
      setDomainStatusError(
        error instanceof Error ? error.message : "Failed to load domain status"
      )
    } finally {
      setDomainStatusLoading(false)
    }
  }

  async function purgeInbox() {
    const email = purgeEmail.trim().toLowerCase()
    if (!email) {
      toast.error("Enter an inbox email first")
      return
    }

    setPurgeLoading(true)
    try {
      const res = await fetch("/api/backend/admin/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = (await res.json().catch(() => null)) as
        | { error?: string; messages_deleted?: number }
        | null

      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to delete inbox")
      }

      toast.success(`Deleted inbox for ${email}`)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete inbox"
      )
    } finally {
      setPurgeLoading(false)
    }
  }

  async function purgeDomainMessages() {
    const domain = purgeDomain.trim().toLowerCase()
    if (!domain) {
      toast.error("Enter a domain first")
      return
    }

    setPurgeLoading(true)
    try {
      const res = await fetch("/api/backend/admin/domain-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      })
      const data = (await res.json().catch(() => null)) as
        | { error?: string; messages_deleted?: number }
        | null

      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to delete domain messages")
      }

      toast.success(`Deleted messages for ${domain}`)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete domain messages"
      )
    } finally {
      setPurgeLoading(false)
    }
  }

  async function purgeMessage() {
    const messageId = purgeMessageId.trim()
    if (!messageId) {
      toast.error("Enter a message ID first")
      return
    }

    setPurgeLoading(true)
    try {
      const res = await fetch("/api/backend/admin/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      })
      const data = (await res.json().catch(() => null)) as
        | { error?: string; deleted?: boolean }
        | null

      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to delete message")
      }

      toast.success(`Deleted message ${messageId}`)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete message"
      )
    } finally {
      setPurgeLoading(false)
    }
  }

  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto flex min-h-svh w-full max-w-7xl flex-col gap-6 p-4 md:p-8">
        <section className="overflow-hidden rounded-3xl border bg-gradient-to-br from-background via-background to-muted/40 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                <ServerIcon className="size-4" />
                Backend Console
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Everything the frontend does not yet surface directly.
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                This page exposes backend health, domain registry, incoming
                domains, API docs, domain status lookup, realtime hooks, and
                maintenance actions.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={health?.ok ? "outline" : "destructive"}>
                {health?.ok ? "Backend healthy" : "Backend degraded"}
              </Badge>
              {backendBaseUrl ? (
                <Badge variant="outline">{hostFromBaseUrl(backendBaseUrl)}</Badge>
              ) : (
                <Badge variant="destructive">Backend URL missing</Badge>
              )}
              {websocketUrl ? (
                <Badge variant="outline">
                  <WebhookIcon className="mr-1 size-3" />
                  WS ready
                </Badge>
              ) : null}
              <Button variant="outline" size="sm" onClick={() => void refreshAll()}>
                <RefreshCwIcon className="mr-2 size-4" />
                Refresh
              </Button>
              {swaggerUrl ? (
                <Button asChild variant="default" size="sm">
                  <Link href={swaggerUrl.toString()} target="_blank">
                    <BookOpenIcon className="mr-2 size-4" />
                    Swagger UI
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </section>

        <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col gap-4">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl bg-muted/40 p-1 md:grid-cols-4">
            <TabsTrigger value="overview">
              <RadarIcon className="mr-2 size-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="domains">
              <GlobeIcon className="mr-2 size-4" />
              Domains
            </TabsTrigger>
            <TabsTrigger value="docs">
              <BookOpenIcon className="mr-2 size-4" />
              Docs
            </TabsTrigger>
            <TabsTrigger value="actions">
              <Trash2Icon className="mr-2 size-4" />
              Actions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0 flex min-h-0 flex-1 flex-col gap-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Public Health</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant={health?.ok ? "outline" : "destructive"}>
                      {health?.ok ? "OK" : "Down"}
                    </Badge>
                    <span>{health?.db ?? health?.error ?? "n/a"}</span>
                  </div>
                  <p className="text-muted-foreground">
                    Redis-backed inbox and domain services are available through
                    the public backend health route.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">System Status</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant={systemStatus ? "outline" : "secondary"}>
                      {systemStatus?.status ?? "unknown"}
                    </Badge>
                    <span>{systemStatus?.app?.env ?? "n/a"}</span>
                  </div>
                  <p className="text-muted-foreground">
                    {systemStatus
                      ? `Redis ${systemStatus.services.redis.online ? "online" : "offline"}, Haraka ${systemStatus.services.haraka.online ? "online" : "offline"}, WS ${systemStatus.services.websocket.enabled ? "enabled" : "disabled"}`
                      : systemStatusError ?? "No system status loaded"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Realtime</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        systemStatus?.services.websocket.enabled ? "outline" : "secondary"
                      }
                    >
                      {systemStatus?.services.websocket.enabled ? "WebSocket" : "Polling"}
                    </Badge>
                    <span>{formatDateTime(systemStatus?.timestamp)}</span>
                  </div>
                  <p className="text-muted-foreground">
                    The frontend can subscribe to backend inbox updates instead
                    of waiting for the next poll.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">System Snapshot</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  <Metric label="CPU" value={`${systemStatus?.cpu.usage_percent ?? 0}%`} />
                  <Metric
                    label="Memory"
                    value={`${systemStatus?.memory.system.usage_percent ?? 0}%`}
                  />
                  <Metric
                    label="Redis latency"
                    value={`${systemStatus?.services.redis.latency_ms ?? 0} ms`}
                  />
                  <Metric
                    label="Haraka latency"
                    value={`${systemStatus?.services.haraka.latency_ms ?? 0} ms`}
                  />
                  <Metric
                    label="API uptime"
                    value={formatDuration(systemStatus?.services.api.uptime_seconds)}
                  />
                  <Metric
                    label="Backend uptime"
                    value={formatDuration(systemStatus?.app.uptime_seconds)}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Connection Details</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 text-sm">
                  <div className="grid gap-2 md:grid-cols-2">
                    <Metric label="Host" value={systemStatus?.host.hostname ?? "n/a"} />
                    <Metric label="Platform" value={systemStatus?.host.platform ?? "n/a"} />
                    <Metric label="Redis" value={systemStatus?.services.redis.version ?? "n/a"} />
                    <Metric label="Haraka" value={`${systemStatus?.services.haraka.host ?? "n/a"}:${systemStatus?.services.haraka.port ?? 0}`} />
                  </div>
                  {systemStatusError ? (
                    <p className="text-destructive">{systemStatusError}</p>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Incoming Domains Registry</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {incomingError ? (
                  <p className="text-sm text-destructive">{incomingError}</p>
                ) : null}
                <div className="overflow-hidden rounded-xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Domain</TableHead>
                        <TableHead>Last Seen</TableHead>
                        <TableHead>Messages</TableHead>
                        <TableHead>MX</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(incoming?.domains ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                            No incoming domains yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        incoming?.domains.map((item) => (
                          <TableRow key={item.domain}>
                            <TableCell className="font-mono text-sm">{item.domain}</TableCell>
                            <TableCell>{formatDateTime(item.last_seen_at)}</TableCell>
                            <TableCell>{item.total_messages}</TableCell>
                            <TableCell>
                              <Badge variant={item.mx_valid ? "outline" : "secondary"}>
                                {item.mx_valid ? "Valid" : "Invalid"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <p className="text-muted-foreground">
                    Page {incoming?.page ?? 1} of {incoming?.total_pages ?? 1}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={incomingLoading || incomingPage <= 1}
                      onClick={() => setIncomingPage((current) => Math.max(1, current - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={incomingLoading || (incoming?.page ?? 1) >= (incoming?.total_pages ?? 1)}
                      onClick={() => setIncomingPage((current) => current + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="domains" className="mt-0 flex min-h-0 flex-1 flex-col gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Domain Status Lookup</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-col gap-2 md:flex-row">
                  <Input
                    value={domainQuery}
                    onChange={(event) => setDomainQuery(event.target.value)}
                    placeholder="example.com"
                  />
                  <Button type="button" onClick={() => void lookupDomain()} disabled={domainStatusLoading}>
                    {domainStatusLoading ? (
                      <Loader2Icon className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Link2Icon className="mr-2 size-4" />
                    )}
                    Inspect
                  </Button>
                </div>
                {domainStatusError ? (
                  <p className="text-sm text-destructive">{domainStatusError}</p>
                ) : null}
                {domainStatus ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <Metric label="Active" value={domainStatus.active ? "Yes" : "No"} />
                    <Metric label="Approved" value={domainStatus.approved ? "Yes" : "No"} />
                    <Metric label="Uptime" value={domainStatus.uptime_label ?? "n/a"} />
                    <Metric label="MX" value={domainStatus.mx_valid ? "Valid" : "Invalid"} />
                    <Metric label="Registered" value={domainStatus.registered ? "Yes" : "No"} />
                    <Metric label="Built-in" value={domainStatus.built_in ? "Yes" : "No"} />
                    <Metric label="Visibility" value={domainStatus.visibility ?? "n/a"} />
                    <Metric label="Reason" value={domainStatus.active_reason} />
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Backend Domain Registry</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <div className="overflow-hidden rounded-xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Path</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {swagger
                        ? Object.keys(swagger.paths)
                            .filter((path) => path.includes("domain"))
                            .map((path) => (
                              <TableRow key={path}>
                                <TableCell className="font-mono text-sm">{path}</TableCell>
                                <TableCell>GET / POST / PATCH / DELETE</TableCell>
                                <TableCell className="text-muted-foreground">
                                  {path === "/domains/status"
                                    ? "Public domain status lookup"
                                    : path === "/list-domain"
                                      ? "Incoming domain registry"
                                      : path === "/domains"
                                        ? "Public domain list and domain create"
                                        : "Domain admin route"}
                                </TableCell>
                              </TableRow>
                            ))
                        : null}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="docs" className="mt-0 flex min-h-0 flex-1 flex-col gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">OpenAPI Summary</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                {swaggerError ? (
                  <p className="text-destructive">{swaggerError}</p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{swagger?.info.title ?? "n/a"}</Badge>
                  <Badge variant="outline">{swagger?.info.version ?? "n/a"}</Badge>
                  <Badge variant="outline">
                    {swagger ? Object.keys(swagger.paths).length : 0} paths
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  {swagger?.info.description ?? "Swagger spec not loaded yet."}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Endpoint Catalog</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <div className="overflow-hidden rounded-xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Path</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {swagger
                        ? Object.keys(swagger.paths)
                            .sort()
                            .map((path) => (
                              <TableRow key={path}>
                                <TableCell className="font-mono text-sm">{path}</TableCell>
                                <TableCell className="text-muted-foreground">
                                  {path === "/swagger"
                                    ? "Swagger UI"
                                    : path === "/swagger.json"
                                      ? "OpenAPI document"
                                      : path === "/system/status"
                                        ? "Protected system status dashboard"
                                        : path === "/health"
                                          ? "Public health"
                                          : path === "/inbox"
                                            ? "Inbox API"
                                            : path === "/messages/{id}"
                                              ? "Message detail API"
                                              : "Backend endpoint"}
                                </TableCell>
                              </TableRow>
                            ))
                        : null}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="mt-0 flex min-h-0 flex-1 flex-col gap-4">
            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Purge Inbox</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <Input
                    value={purgeEmail}
                    onChange={(event) => setPurgeEmail(event.target.value)}
                    placeholder="local@domain.com"
                  />
                  <Button type="button" variant="destructive" onClick={() => void purgeInbox()} disabled={purgeLoading}>
                    <Trash2Icon className="mr-2 size-4" />
                    Delete Inbox
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Delete Domain Messages</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <Input
                    value={purgeDomain}
                    onChange={(event) => setPurgeDomain(event.target.value)}
                    placeholder="domain.com"
                  />
                  <Button type="button" variant="destructive" onClick={() => void purgeDomainMessages()} disabled={purgeLoading}>
                    <ShieldAlertIcon className="mr-2 size-4" />
                    Delete Domain Messages
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Delete Message by ID</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <Input
                    value={purgeMessageId}
                    onChange={(event) => setPurgeMessageId(event.target.value)}
                    placeholder="message-id"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => void purgeMessage()}
                    disabled={purgeLoading}
                  >
                    <Trash2Icon className="mr-2 size-4" />
                    Delete Message
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {sessionState !== "admin" ? (
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Admin Session Required</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p>
                Open the floating admin session dialog and sign in to unlock the
                backend console.
              </p>
              {sessionError ? (
                <p className="text-destructive">{sessionError}</p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
}
