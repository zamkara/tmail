"use client"

import { FormEvent, useEffect, useState } from "react"
import {
  DownloadIcon,
  GaugeIcon,
  GlobeIcon,
  LogOutIcon,
  MailIcon,
  PlusIcon,
  RefreshCwIcon,
  PencilIcon,
  SaveIcon,
  ShieldIcon,
  TrashIcon,
  UsersIcon,
  TicketIcon,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type SessionStatus = "checking" | "guest" | "admin"
interface AdminUser {
  id: string
  name: string
  email: string
  isBanned: boolean
  banReason: string
  createdAt: string
}

interface AdminDomain {
  id: string
  name: string
  type: "system" | "custom"
  source: "system" | "user" | "guest"
  isVerified: boolean
  visibility: "public" | "private"
  privateUntil: string | null
  isBanned: boolean
  banReason: string
  owner: { id: string; name: string; email: string } | null
  createdAt: string
}

interface AdminSettings {
  maxAddressesPerUser: number
  addressTtlHours: number
  allowGuestAddresses: boolean
  allowWildcardSubdomains: boolean
  inboxRefreshSeconds: number
}

interface AdminAddress {
  id: string
  address: string
  userId: string
  domainId: string
  user: { id: string; name: string; email: string } | null
  domain:
    | {
        id: string
        name: string
        type: "system" | "custom"
        source: "system" | "user" | "guest"
      }
    | null
  expiresAt: string
  createdAt: string
}

interface AdminVoucher {
  id: string
  code: string
  durationDays: number
  maxUses: number
  usedCount: number
  expiresAt: string
  isActive: boolean
  note: string
  createdAt: string
}

interface AdminOverview {
  stats: {
    users: number
    domains: number
    addresses: number
    activeAddresses: number
    vouchers: number
  }
  users: AdminUser[]
  domains: AdminDomain[]
  addresses: AdminAddress[]
  vouchers: AdminVoucher[]
  settings: AdminSettings
}

interface AdminHealth {
  ok: boolean
  db?: string
  host?: string
  error?: string
}

async function readJsonResponse<T>(res: Response) {
  const text = await res.text()
  const data = text ? (JSON.parse(text) as T & { error?: string }) : null

  if (!res.ok) {
    throw new Error(data?.error ?? `Request failed with status ${res.status}`)
  }

  if (!data) throw new Error("Empty response")
  return data
}

export default function AdminSessionDialog() {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<SessionStatus>("checking")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadSession() {
      try {
        const res = await fetch("/api/admin/session", { cache: "no-store" })
        const data = (await res.json()) as { authenticated?: boolean }
        if (!cancelled) setStatus(data.authenticated ? "admin" : "guest")
      } catch {
        if (!cancelled) setStatus("guest")
      }
    }

    void loadSession()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "a"
      ) {
        event.preventDefault()
        setOpen(true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      const data = (await res.json()) as { error?: string }

      if (!res.ok) {
        setError(data.error ?? "Failed to start admin session")
        return
      }

      setPassword("")
      setStatus("admin")
      setOpen(true)
      toast.success("Admin session started")
    } catch {
      setError("Failed to start admin session")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleLogout() {
    setIsSubmitting(true)

    try {
      await fetch("/api/admin/session", { method: "DELETE" })
      setStatus("guest")
      setPassword("")
      toast.success("Admin session ended")
    } catch {
      toast.error("Failed to end admin session")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {status === "admin" ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="fixed right-4 bottom-4"
              aria-label="Open admin session"
              onClick={() => setOpen(true)}
            >
              <ShieldIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Admin</TooltipContent>
        </Tooltip>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100svh-2rem)] overflow-hidden sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Admin Session</DialogTitle>
            <DialogDescription>
              Sign in to access application management tools.
            </DialogDescription>
            <Button asChild variant="outline" className="mt-2 w-fit">
              <Link href="/dashboard">Open Backend Console</Link>
            </Button>
          </DialogHeader>

          {status === "checking" ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Spinner />
              <span>Checking session...</span>
            </div>
          ) : status === "admin" ? (
            <AdminPanel onLogout={handleLogout} isLoggingOut={isSubmitting} />
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <FieldGroup>
                <Field data-invalid={Boolean(error)}>
                  <FieldLabel htmlFor="admin-password">Password</FieldLabel>
                  <Input
                    id="admin-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    aria-invalid={Boolean(error)}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <FieldDescription>
                    Use the admin password configured on the server.
                  </FieldDescription>
                  {error ? (
                    <p className="text-sm text-destructive">{error}</p>
                  ) : null}
                </Field>
              </FieldGroup>

              <DialogFooter>
                <Button type="submit" disabled={!password || isSubmitting}>
                  {isSubmitting ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <ShieldIcon data-icon="inline-start" />
                  )}
                  Start Session
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function AdminPanel({
  onLogout,
  isLoggingOut,
}: {
  onLogout: () => Promise<void>
  isLoggingOut: boolean
}) {
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [health, setHealth] = useState<AdminHealth | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  async function loadOverview() {
    setIsLoading(true)
    setLoadError(null)

    try {
      const [healthRes, overviewRes] = await Promise.all([
        fetch("/api/admin/health", { cache: "no-store" }),
        fetch("/api/admin/overview", { cache: "no-store" }),
      ])
      const healthData = await readJsonResponse<AdminHealth>(healthRes)
      const data = await readJsonResponse<AdminOverview>(overviewRes)

      setHealth(healthData)
      setOverview(data)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load admin data"
      setLoadError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadOverview()
  }, [])

  async function deleteUser(userId: string) {
    if (!window.confirm("Delete this account and its related data?")) return

    setIsSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("delete failed")
      toast.success("Account deleted")
      await loadOverview()
    } catch {
      toast.error("Failed to delete account")
    } finally {
      setIsSaving(false)
    }
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)

    setIsSaving(true)
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(formData.get("name") ?? ""),
          email: String(formData.get("email") ?? ""),
          password: String(formData.get("password") ?? ""),
        }),
      })
      await readJsonResponse<AdminUser>(res)
      form.reset()
      toast.success("Account created")
      await loadOverview()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create account"
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function updateUser(
    userId: string,
    payload: {
      name: string
      email: string
      password?: string
      isBanned: boolean
      banReason: string
    }
  ) {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      await readJsonResponse<AdminUser>(res)
      toast.success("Account updated")
      await loadOverview()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update account"
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteDomain(domainId: string) {
    if (!window.confirm("Delete this domain and related addresses?")) return

    setIsSaving(true)
    try {
      const res = await fetch(`/api/admin/domains/${domainId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("delete failed")
      toast.success("Domain deleted")
      await loadOverview()
    } catch {
      toast.error("Failed to delete domain")
    } finally {
      setIsSaving(false)
    }
  }

  async function toggleDomain(domain: AdminDomain) {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/admin/domains/${domain.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVerified: !domain.isVerified }),
      })
      if (!res.ok) throw new Error("update failed")
      await loadOverview()
    } catch {
      toast.error("Failed to update domain")
    } finally {
      setIsSaving(false)
    }
  }

  async function updateDomain(
    domainId: string,
    payload: {
      name: string
      isVerified: boolean
      visibility: "public" | "private"
      privateUntil: string
      isBanned: boolean
      banReason: string
    }
  ) {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/admin/domains/${domainId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      await readJsonResponse<AdminDomain>(res)
      toast.success("Domain updated")
      await loadOverview()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update domain"
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function addDomain(name: string) {
    setIsSaving(true)
    try {
      const res = await fetch("/api/admin/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type: "system", isVerified: true }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? "create failed")
      toast.success("Domain added")
      await loadOverview()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add domain"
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function syncDomains() {
    setIsSaving(true)

    try {
      const res = await fetch("/api/admin/domains/sync", { method: "POST" })
      await readJsonResponse<{ synced: string[] }>(res)
      toast.success("System domains synced")
      await loadOverview()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to sync domains"
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function saveSettings(settings: AdminSettings) {
    setIsSaving(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      const data = (await res.json()) as AdminSettings & { error?: string }
      if (!res.ok) throw new Error(data.error ?? "save failed")
      setOverview((current) =>
        current ? { ...current, settings: data } : current
      )
      toast.success("Limits saved")
    } catch {
      toast.error("Failed to save limits")
    } finally {
      setIsSaving(false)
    }
  }

  async function createAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)

    setIsSaving(true)
    try {
      const res = await fetch("/api/admin/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: String(formData.get("address") ?? ""),
          userId: String(formData.get("userId") ?? ""),
          domainId: String(formData.get("domainId") ?? ""),
          expiresAt: String(formData.get("expiresAt") ?? ""),
        }),
      })
      await readJsonResponse<AdminAddress>(res)
      form.reset()
      toast.success("Address created")
      await loadOverview()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create address"
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function updateAddress(
    addressId: string,
    payload: {
      address: string
      userId: string
      domainId: string
      expiresAt: string
    }
  ) {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/admin/addresses/${addressId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      await readJsonResponse<AdminAddress>(res)
      toast.success("Address updated")
      await loadOverview()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update address"
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteAddress(addressId: string) {
    if (!window.confirm("Delete this address?")) return

    setIsSaving(true)
    try {
      const res = await fetch(`/api/admin/addresses/${addressId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("delete failed")
      toast.success("Address deleted")
      await loadOverview()
    } catch {
      toast.error("Failed to delete address")
    } finally {
      setIsSaving(false)
    }
  }

  async function bulkCreateVouchers(data: {
    code: string
    durationDays: number
    maxUses: number
    expiresAt: string
    note: string
    count: number
  }) {
    setIsSaving(true)
    try {
      const res = await fetch("/api/admin/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      await readJsonResponse(res)
      toast.success(`Created ${data.count} voucher(s)`)
      await loadOverview()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create vouchers"
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function updateVoucher(
    voucherId: string,
    payload: {
      durationDays: number
      maxUses: number
      expiresAt: string
      isActive: boolean
      note: string
    }
  ) {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/admin/vouchers/${voucherId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      await readJsonResponse<AdminVoucher>(res)
      toast.success("Voucher updated")
      await loadOverview()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update voucher"
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteVoucher(voucherId: string) {
    if (!window.confirm("Delete this voucher?")) return

    setIsSaving(true)
    try {
      const res = await fetch(`/api/admin/vouchers/${voucherId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("delete failed")
      toast.success("Voucher deleted")
      await loadOverview()
    } catch {
      toast.error("Failed to delete voucher")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Tabs defaultValue="overview" className="flex min-h-0 flex-col gap-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-muted/20 p-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-base font-semibold">Admin Console</h2>
            <p className="text-sm text-muted-foreground">
              Manage accounts, domains, addresses, vouchers, and platform rules.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={health?.ok ? "outline" : "destructive"}>
              {health?.ok ? "Database OK" : "Database Issue"}
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Refresh admin data"
              disabled={isLoading}
              onClick={() => void loadOverview()}
            >
              {isLoading ? <Spinner /> : <RefreshCwIcon />}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLoggingOut}
              onClick={() => void onLogout()}
            >
              {isLoggingOut ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <LogOutIcon data-icon="inline-start" />
              )}
              End Session
            </Button>
          </div>
        </div>

        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-lg bg-muted/40 p-1 md:grid-cols-6">
          <TabsTrigger value="overview">
            <GaugeIcon data-icon="inline-start" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="users">
            <UsersIcon data-icon="inline-start" />
            Accounts
          </TabsTrigger>
          <TabsTrigger value="domains">
            <GlobeIcon data-icon="inline-start" />
            Domains
          </TabsTrigger>
          <TabsTrigger value="addresses">
            <MailIcon data-icon="inline-start" />
            Addresses
          </TabsTrigger>
          <TabsTrigger value="vouchers">
            <TicketIcon data-icon="inline-start" />
            Vouchers
          </TabsTrigger>
          <TabsTrigger value="limits">
            <ShieldIcon data-icon="inline-start" />
            Limits
          </TabsTrigger>
        </TabsList>
      </div>

      <Separator />

      <ScrollArea className="h-[min(68svh,680px)] pr-3">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Spinner />
            <span>Loading admin data...</span>
          </div>
        ) : loadError ? (
          <Card>
            <CardHeader>
              <CardTitle>Admin data unavailable</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">{loadError}</p>
              <Button
                type="button"
                variant="outline"
                className="w-fit"
                onClick={() => void loadOverview()}
              >
                <RefreshCwIcon data-icon="inline-start" />
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : !overview ? (
          <Card>
            <CardHeader>
              <CardTitle>No admin data</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadOverview()}
              >
                <RefreshCwIcon data-icon="inline-start" />
                Load Data
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <TabsContent value="overview" className="mt-0">
              <OverviewModule overview={overview} health={health} />
            </TabsContent>
            <TabsContent value="users" className="mt-0">
              <UsersModule
                users={overview.users}
                disabled={isSaving}
                onCreate={createUser}
                onUpdate={updateUser}
                onDelete={deleteUser}
              />
            </TabsContent>
            <TabsContent value="domains" className="mt-0">
              <DomainsModule
                domains={overview.domains}
                disabled={isSaving}
                onAdd={addDomain}
                onDelete={deleteDomain}
                onToggle={toggleDomain}
                onUpdate={updateDomain}
                onSync={syncDomains}
              />
            </TabsContent>
            <TabsContent value="addresses" className="mt-0">
              <AddressesModule
                addresses={overview.addresses}
                users={overview.users}
                domains={overview.domains}
                disabled={isSaving}
                onCreate={createAddress}
                onUpdate={updateAddress}
                onDelete={deleteAddress}
              />
            </TabsContent>
            <TabsContent value="vouchers" className="mt-0">
              <VouchersModule
                vouchers={overview.vouchers}
                disabled={isSaving}
                onBulkCreate={bulkCreateVouchers}
                onUpdate={updateVoucher}
                onDelete={deleteVoucher}
              />
            </TabsContent>
            <TabsContent value="limits" className="mt-0">
              <LimitsModule
                settings={overview.settings}
                disabled={isSaving}
                onSave={saveSettings}
              />
            </TabsContent>
          </>
        )}
      </ScrollArea>
    </Tabs>
  )
}

function OverviewModule({
  overview,
  health,
}: {
  overview: AdminOverview
  health: AdminHealth | null
}) {
  const stats = [
    ["Accounts", overview.stats.users],
    ["Domains", overview.stats.domains],
    ["Addresses", overview.stats.addresses],
    ["Active", overview.stats.activeAddresses],
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium">System Overview</h3>
        <p className="text-sm text-muted-foreground">
          Current platform totals and service health.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Database</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={health?.ok ? "outline" : "destructive"}>
                {health?.ok ? "Connected" : "Unavailable"}
              </Badge>
              {health?.db ? <span>{health.db}</span> : null}
            </div>
            {health?.host ? (
              <p className="text-muted-foreground">{health.host}</p>
            ) : null}
            {health?.error ? (
              <p className="text-destructive">{health.error}</p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Inventory</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <MetricLabel label="Vouchers" value={overview.stats.vouchers} />
            <MetricLabel
              label="Idle Addresses"
              value={Math.max(
                overview.stats.addresses - overview.stats.activeAddresses,
                0
              )}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function UsersModule({
  users,
  disabled,
  onCreate,
  onUpdate,
  onDelete,
}: {
  users: AdminUser[]
  disabled: boolean
  onCreate: (event: FormEvent<HTMLFormElement>) => Promise<void>
  onUpdate: (
    userId: string,
    payload: {
      name: string
      email: string
      password?: string
      isBanned: boolean
      banReason: string
    }
  ) => Promise<void>
  onDelete: (userId: string) => Promise<void>
}) {
  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Create Account</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={onCreate}
            className="grid gap-2 lg:grid-cols-[1fr_1.2fr_1fr_auto]"
          >
            <Input name="name" placeholder="Name" disabled={disabled} />
            <Input
              name="email"
              type="email"
              placeholder="Email"
              disabled={disabled}
            />
            <Input
              name="password"
              type="password"
              placeholder="Password"
              disabled={disabled}
            />
            <Button type="submit" disabled={disabled}>
              <PlusIcon data-icon="inline-start" />
              Add
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{users.length} Account(s)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {users.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              disabled={disabled}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function UserRow({
  user,
  disabled,
  onUpdate,
  onDelete,
}: {
  user: AdminUser
  disabled: boolean
  onUpdate: (
    userId: string,
    payload: {
      name: string
      email: string
      password?: string
      isBanned: boolean
      banReason: string
    }
  ) => Promise<void>
  onDelete: (userId: string) => Promise<void>
}) {
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [password, setPassword] = useState("")
  const [isBanned, setIsBanned] = useState(user.isBanned)
  const [banReason, setBanReason] = useState(user.banReason)

  useEffect(() => {
    setName(user.name)
    setEmail(user.email)
    setPassword("")
    setIsBanned(user.isBanned)
    setBanReason(user.banReason)
  }, [user])

  return (
    <div className="rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{user.email}</p>
          <p className="text-xs text-muted-foreground">{user.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isBanned ? "secondary" : "outline"}>
            {isBanned ? "Banned" : "Active"}
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={`Save ${user.email}`}
            disabled={disabled}
            onClick={() =>
              void onUpdate(user.id, {
                name,
                email,
                isBanned,
                banReason,
                ...(password ? { password } : {}),
              })
            }
          >
            <PencilIcon />
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="icon-sm"
            aria-label={`Delete ${user.email}`}
            disabled={disabled}
            onClick={() => void onDelete(user.id)}
          >
            <TrashIcon />
          </Button>
        </div>
      </div>
      <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-[1fr_1.2fr_1fr_1fr_auto]">
        <Input
          value={name}
          disabled={disabled}
          onChange={(event) => setName(event.target.value)}
        />
        <Input
          type="email"
          value={email}
          disabled={disabled}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          type="password"
          value={password}
          placeholder="New password"
          disabled={disabled}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Input
          value={banReason}
          placeholder="Ban reason"
          disabled={disabled || !isBanned}
          onChange={(event) => setBanReason(event.target.value)}
        />
        <div className="flex items-center gap-2 rounded-md border px-3">
          <Switch
            checked={isBanned}
            disabled={disabled}
            aria-label={`Ban ${user.email}`}
            onCheckedChange={setIsBanned}
          />
          <span className="text-sm text-muted-foreground">Ban</span>
        </div>
      </div>
    </div>
  )
}

function DomainsModule({
  domains,
  disabled,
  onAdd,
  onDelete,
  onToggle,
  onUpdate,
  onSync,
}: {
  domains: AdminDomain[]
  disabled: boolean
  onAdd: (name: string) => Promise<void>
  onDelete: (domainId: string) => Promise<void>
  onToggle: (domain: AdminDomain) => Promise<void>
  onUpdate: (
    domainId: string,
    payload: {
      name: string
      isVerified: boolean
      visibility: "public" | "private"
      privateUntil: string
      isBanned: boolean
      banReason: string
    }
  ) => Promise<void>
  onSync: () => Promise<void>
}) {
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editDomain, setEditDomain] = useState<AdminDomain | null>(null)
  const [editVerified, setEditVerified] = useState(false)
  const [editBanned, setEditBanned] = useState(false)
  const [editVisibility, setEditVisibility] = useState<"public" | "private">(
    "public"
  )
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === domains.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(domains.map((d) => d.id)))
    }
  }

  function exportCSV() {
    const items =
      selectedIds.size > 0
        ? domains.filter((d) => selectedIds.has(d.id))
        : domains
    const headers = [
      "Name",
      "Type",
      "Verified",
      "Visibility",
      "Owner",
      "Banned",
    ]
    const rows = items.map((d) => [
      d.name,
      d.type,
      d.isVerified ? "Yes" : "No",
      d.visibility,
      d.owner?.email ?? "System",
      d.isBanned ? "Yes" : "No",
    ])
    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((c) => `"${c}"`).join(",")),
    ].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `domains-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Domain Controls</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {domains.length} domain(s)
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={domains.length === 0}
              onClick={exportCSV}
            >
              <DownloadIcon data-icon="inline-start" />
              Export CSV
              {selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => void onSync()}
            >
              <RefreshCwIcon data-icon="inline-start" />
              Sync
            </Button>
            <Button onClick={() => setAddOpen(true)} disabled={disabled}>
              <PlusIcon data-icon="inline-start" />
              Add Domain
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Domain</DialogTitle>
            <DialogDescription>
              Add a system domain to the platform.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const form = new FormData(e.currentTarget)
              const name = String(form.get("name") ?? "").trim()
              if (!name) return
              await onAdd(name)
              setAddOpen(false)
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="d-name">Domain</FieldLabel>
                <Input
                  id="d-name"
                  name="name"
                  placeholder="example.com"
                  required
                />
              </Field>
            </FieldGroup>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={disabled}>
                <PlusIcon data-icon="inline-start" />
                Add
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v)
          if (!v) {
            setEditDomain(null)
            setEditVisibility("public")
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Domain</DialogTitle>
            <DialogDescription>{editDomain?.name ?? ""}</DialogDescription>
          </DialogHeader>
          {editDomain && (
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const form = new FormData(e.currentTarget)
                await onUpdate(editDomain.id, {
                  name: String(form.get("name") ?? ""),
                  isVerified: editVerified,
                  visibility: editVisibility,
                  privateUntil:
                    editVisibility === "private"
                      ? String(form.get("privateUntil") ?? "")
                      : "",
                  isBanned: editBanned,
                  banReason: String(form.get("banReason") ?? ""),
                })
                setEditOpen(false)
                setEditDomain(null)
              }}
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="d-edit-name">Name</FieldLabel>
                  <Input
                    id="d-edit-name"
                    name="name"
                    defaultValue={editDomain.name}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="d-edit-visibility">Access</FieldLabel>
                  <Select
                    value={editVisibility}
                    onValueChange={(value) =>
                      setEditVisibility(value as "public" | "private")
                    }
                  >
                    <SelectTrigger id="d-edit-visibility" className="w-full">
                      <SelectValue placeholder="Select access" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem
                          value="private"
                          disabled={!editDomain.owner}
                        >
                          Private
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    {editVisibility === "public"
                      ? "Public domains are visible in guest mode and can be used by anyone."
                      : "Private domains are hidden from guests and only usable by the signed-in owner in /inbox."}
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel>Ownership</FieldLabel>
                  <div className="flex min-h-8 items-center gap-2 rounded-md border border-input bg-muted/30 px-3 py-1 text-sm">
                    <Badge
                      variant={
                        editDomain.type === "system" ? "secondary" : "outline"
                      }
                    >
                      {editDomain.type === "system" ? "System" : "Custom"}
                    </Badge>
                    <span className="truncate text-muted-foreground">
                      {editDomain.owner?.email ?? "No owner assigned"}
                    </span>
                  </div>
                  <FieldDescription>
                    {editDomain.owner
                      ? "Private access keeps this domain tied to its owner account."
                      : "Private access requires an owner account, so system domains stay public here."}
                  </FieldDescription>
                </Field>
                <Field data-disabled={editVisibility !== "private"}>
                  <FieldLabel htmlFor="d-edit-until">Private Until</FieldLabel>
                  <Input
                    id="d-edit-until"
                    name="privateUntil"
                    type="datetime-local"
                    disabled={editVisibility !== "private"}
                    defaultValue={
                      editDomain.privateUntil
                        ? toDateTimeLocal(editDomain.privateUntil)
                        : ""
                    }
                  />
                  <FieldDescription>
                    {editVisibility === "private"
                      ? "Optional expiry for the owner's private access window."
                      : "Only applies when access is private."}
                  </FieldDescription>
                </Field>
                <Field orientation="horizontal">
                  <Switch
                    id="d-edit-verified"
                    checked={editVerified}
                    onCheckedChange={setEditVerified}
                  />
                  <FieldLabel htmlFor="d-edit-verified">Verified</FieldLabel>
                </Field>
                <Field orientation="horizontal">
                  <Switch
                    id="d-edit-banned"
                    checked={editBanned}
                    onCheckedChange={setEditBanned}
                  />
                  <FieldLabel htmlFor="d-edit-banned">Banned</FieldLabel>
                </Field>
                <Field>
                  <FieldLabel htmlFor="d-edit-reason">Ban Reason</FieldLabel>
                  <Input
                    id="d-edit-reason"
                    name="banReason"
                    defaultValue={editDomain.banReason}
                    placeholder="Reason for ban"
                  />
                </Field>
              </FieldGroup>
              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditOpen(false)
                    setEditDomain(null)
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={disabled}>
                  <SaveIcon data-icon="inline-start" />
                  Save
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Card className="min-h-0 flex-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Domain Directory</CardTitle>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={
                      domains.length > 0 && selectedIds.size === domains.length
                    }
                    onChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {domains.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No domains yet
                  </TableCell>
                </TableRow>
              ) : (
                domains.map((domain) => (
                  <TableRow
                    key={domain.id}
                    className="cursor-pointer"
                    onClick={() => toggleSelect(domain.id)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="size-4"
                        checked={selectedIds.has(domain.id)}
                        onChange={() => toggleSelect(domain.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <code className="text-sm font-medium">{domain.name}</code>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {domain.type}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {domain.source === "system"
                          ? "System"
                          : domain.source === "user"
                            ? "User"
                            : "Guest"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={domain.isVerified ? "default" : "secondary"}
                        >
                          {domain.isVerified ? "Verified" : "Unverified"}
                        </Badge>
                        {domain.isBanned && (
                          <Badge variant="secondary">Banned</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-32 truncate text-muted-foreground">
                      {domain.owner?.email ??
                        (domain.source === "guest" ? "Guest" : "System")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          aria-label={`Edit ${domain.name}`}
                          disabled={disabled}
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditDomain(domain)
                            setEditVerified(domain.isVerified)
                            setEditBanned(domain.isBanned)
                            setEditVisibility(domain.visibility)
                            setEditOpen(true)
                          }}
                        >
                          <PencilIcon />
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon-sm"
                          aria-label={`Delete ${domain.name}`}
                          disabled={disabled}
                          onClick={(e) => {
                            e.stopPropagation()
                            void onDelete(domain.id)
                          }}
                        >
                          <TrashIcon />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function formatDuration(days: number) {
  if (days >= 365 && days % 365 === 0) return `${days / 365} year(s)`
  if (days >= 30 && days % 30 === 0) return `${days / 30} month(s)`
  return `${days} day(s)`
}

function toDateTimeLocal(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function AddressesModule({
  addresses,
  users,
  domains,
  disabled,
  onCreate,
  onUpdate,
  onDelete,
}: {
  addresses: AdminAddress[]
  users: AdminUser[]
  domains: AdminDomain[]
  disabled: boolean
  onCreate: (event: FormEvent<HTMLFormElement>) => Promise<void>
  onUpdate: (
    addressId: string,
    payload: {
      address: string
      userId: string
      domainId: string
      expiresAt: string
    }
  ) => Promise<void>
  onDelete: (addressId: string) => Promise<void>
}) {
  const defaultExpiry = toDateTimeLocal(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  )

  return (
    <div className="flex flex-col gap-3">
      <Card size="sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Create Address</CardTitle>
          <CardDescription>
            Create a managed address for a specific account and domain.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="flex flex-col gap-3">
            <FieldGroup className="grid gap-3 xl:grid-cols-[1.3fr_1fr_1fr_12rem]">
              <Field>
                <FieldLabel htmlFor="a-create-address">Address</FieldLabel>
                <Input
                  id="a-create-address"
                  name="address"
                  placeholder="local@domain.com"
                  disabled={disabled}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="a-create-user">Owner</FieldLabel>
                <select
                  id="a-create-user"
                  name="userId"
                  disabled={disabled}
                  className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select user
                  </option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email}
                    </option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="a-create-domain">Domain</FieldLabel>
                <select
                  id="a-create-domain"
                  name="domainId"
                  disabled={disabled}
                  className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select domain
                  </option>
                  {domains.map((domain) => (
                    <option key={domain.id} value={domain.id}>
                      {domain.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="a-create-expiry">Expires</FieldLabel>
                <Input
                  id="a-create-expiry"
                  name="expiresAt"
                  type="datetime-local"
                  defaultValue={defaultExpiry}
                  disabled={disabled}
                />
              </Field>
            </FieldGroup>
            <div className="flex justify-end">
              <Button type="submit" disabled={disabled}>
                <PlusIcon data-icon="inline-start" />
                Add Address
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            {addresses.length} Address(es)
          </CardTitle>
          <CardDescription>
            Review ownership, assigned domain, and expiry. Edit each address in
            a focused dialog.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {addresses.map((address) => (
            <AddressRow
              key={address.id}
              address={address}
              users={users}
              domains={domains}
              disabled={disabled}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function AddressRow({
  address,
  users,
  domains,
  disabled,
  onUpdate,
  onDelete,
}: {
  address: AdminAddress
  users: AdminUser[]
  domains: AdminDomain[]
  disabled: boolean
  onUpdate: (
    addressId: string,
    payload: {
      address: string
      userId: string
      domainId: string
      expiresAt: string
    }
  ) => Promise<void>
  onDelete: (addressId: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(address.address)
  const [userId, setUserId] = useState(address.userId)
  const [domainId, setDomainId] = useState(address.domainId)
  const [expiresAt, setExpiresAt] = useState(toDateTimeLocal(address.expiresAt))

  useEffect(() => {
    setValue(address.address)
    setUserId(address.userId)
    setDomainId(address.domainId)
    setExpiresAt(toDateTimeLocal(address.expiresAt))
  }, [address, open])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-2">
            <code className="truncate text-sm font-medium">
              {address.address}
            </code>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">
                {address.user?.email ?? "Unknown user"}
              </Badge>
              <Badge variant="outline">
                {address.domain?.name ?? "Unknown domain"}
              </Badge>
              <Badge variant="secondary">
                Expires {new Date(address.expiresAt).toLocaleString()}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label={`Edit ${address.address}`}
              disabled={disabled}
              onClick={() => setOpen(true)}
            >
              <PencilIcon />
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="icon-sm"
              aria-label={`Delete ${address.address}`}
              disabled={disabled}
              onClick={() => void onDelete(address.id)}
            >
              <TrashIcon />
            </Button>
          </div>
        </div>
      </div>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Address</DialogTitle>
          <DialogDescription>{address.address}</DialogDescription>
        </DialogHeader>
        <FieldGroup className="grid gap-3 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`a-edit-address-${address.id}`}>
              Address
            </FieldLabel>
            <Input
              id={`a-edit-address-${address.id}`}
              value={value}
              disabled={disabled}
              onChange={(event) => setValue(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`a-edit-owner-${address.id}`}>
              Owner
            </FieldLabel>
            <select
              id={`a-edit-owner-${address.id}`}
              value={userId}
              disabled={disabled}
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
              onChange={(event) => setUserId(event.target.value)}
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor={`a-edit-domain-${address.id}`}>
              Domain
            </FieldLabel>
            <select
              id={`a-edit-domain-${address.id}`}
              value={domainId}
              disabled={disabled}
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
              onChange={(event) => setDomainId(event.target.value)}
            >
              {domains.map((domain) => (
                <option key={domain.id} value={domain.id}>
                  {domain.name}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor={`a-edit-expiry-${address.id}`}>
              Expires
            </FieldLabel>
            <Input
              id={`a-edit-expiry-${address.id}`}
              type="datetime-local"
              value={expiresAt}
              disabled={disabled}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={disabled}
            onClick={async () => {
              await onUpdate(address.id, {
                address: value,
                userId,
                domainId,
                expiresAt,
              })
              setOpen(false)
            }}
          >
            <SaveIcon data-icon="inline-start" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function VouchersModule({
  vouchers,
  disabled,
  onBulkCreate,
  onUpdate,
  onDelete,
}: {
  vouchers: AdminVoucher[]
  disabled: boolean
  onBulkCreate: (data: {
    code: string
    durationDays: number
    maxUses: number
    expiresAt: string
    note: string
    count: number
  }) => Promise<void>
  onUpdate: (
    voucherId: string,
    payload: {
      durationDays: number
      maxUses: number
      expiresAt: string
      isActive: boolean
      note: string
    }
  ) => Promise<void>
  onDelete: (voucherId: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === vouchers.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(vouchers.map((v) => v.id)))
    }
  }

  function exportCSV() {
    const items =
      selectedIds.size > 0
        ? vouchers.filter((v) => selectedIds.has(v.id))
        : vouchers
    const headers = ["Code", "Duration", "Max Uses", "Used", "Status", "Note"]
    const rows = items.map((v) => [
      v.code,
      formatDuration(v.durationDays),
      String(v.maxUses),
      String(v.usedCount),
      v.isActive ? "Active" : "Inactive",
      v.note,
    ])
    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((c) => `"${c}"`).join(",")),
    ].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `vouchers-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Voucher Controls</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {vouchers.length} voucher(s)
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={vouchers.length === 0}
              onClick={exportCSV}
            >
              <DownloadIcon data-icon="inline-start" />
              Export CSV
              {selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
            </Button>
            <Button onClick={() => setOpen(true)} disabled={disabled}>
              <PlusIcon data-icon="inline-start" />
              Create Voucher
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Voucher</DialogTitle>
            <DialogDescription>
              Generate one or more voucher codes.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const form = new FormData(e.currentTarget)
              const durVal = Number(form.get("duration") ?? 30)
              const durUnit = String(form.get("durUnit") ?? "days")
              const durationDays =
                durUnit === "years"
                  ? durVal * 365
                  : durUnit === "months"
                    ? durVal * 30
                    : durVal

              await onBulkCreate({
                code: String(form.get("code") ?? ""),
                durationDays,
                maxUses: Number(form.get("maxUses") ?? 1),
                expiresAt: "",
                note: String(form.get("note") ?? ""),
                count: Number(form.get("count") ?? 1),
              })
              setOpen(false)
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="v-code">Code Prefix</FieldLabel>
                <Input
                  id="v-code"
                  name="code"
                  placeholder="Auto-generated if empty"
                />
                <FieldDescription>
                  Random suffix added automatically
                </FieldDescription>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="v-uses">Max Uses</FieldLabel>
                  <Input
                    id="v-uses"
                    name="maxUses"
                    type="number"
                    min={1}
                    defaultValue={1}
                  />
                </Field>
                <Field>
                  <FieldLabel>Active Duration</FieldLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      name="duration"
                      type="number"
                      min={1}
                      defaultValue={30}
                    />
                    <select
                      name="durUnit"
                      defaultValue="days"
                      className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      <option value="days">Days</option>
                      <option value="months">Months</option>
                      <option value="years">Years</option>
                    </select>
                  </div>
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="v-note">Note</FieldLabel>
                <Input id="v-note" name="note" placeholder="Optional" />
              </Field>
              <Field>
                <FieldLabel htmlFor="v-count">Count</FieldLabel>
                <Input
                  id="v-count"
                  name="count"
                  type="number"
                  min={1}
                  max={100}
                  defaultValue={1}
                />
                <FieldDescription>
                  Number of vouchers to generate (max 100)
                </FieldDescription>
              </Field>
            </FieldGroup>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={disabled}>
                <PlusIcon data-icon="inline-start" />
                Generate
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="min-h-0 flex-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Voucher Directory</CardTitle>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={
                      vouchers.length > 0 &&
                      selectedIds.size === vouchers.length
                    }
                    onChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Used</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {vouchers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No vouchers yet
                  </TableCell>
                </TableRow>
              ) : (
                vouchers.map((voucher) => (
                  <TableRow
                    key={voucher.id}
                    className="cursor-pointer"
                    onClick={() => toggleSelect(voucher.id)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="size-4"
                        checked={selectedIds.has(voucher.id)}
                        onChange={() => toggleSelect(voucher.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <code className="text-sm font-medium">
                        {voucher.code}
                      </code>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDuration(voucher.durationDays)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {voucher.usedCount}/{voucher.maxUses}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-40 truncate text-muted-foreground">
                      {voucher.note || "—"}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={voucher.isActive}
                        disabled={disabled}
                        aria-label={`Toggle ${voucher.code}`}
                        onCheckedChange={(checked) =>
                          void onUpdate(voucher.id, {
                            durationDays: voucher.durationDays,
                            maxUses: voucher.maxUses,
                            expiresAt: voucher.expiresAt,
                            isActive: checked,
                            note: voucher.note,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon-sm"
                        aria-label={`Delete ${voucher.code}`}
                        disabled={disabled}
                        onClick={() => void onDelete(voucher.id)}
                      >
                        <TrashIcon />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function LimitsModule({
  settings,
  disabled,
  onSave,
}: {
  settings: AdminSettings
  disabled: boolean
  onSave: (settings: AdminSettings) => Promise<void>
}) {
  const [draft, setDraft] = useState(settings)

  useEffect(() => {
    setDraft(settings)
  }, [settings])

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        void onSave(draft)
      }}
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Usage Limits</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="max-addresses">
                Max addresses per user
              </FieldLabel>
              <Input
                id="max-addresses"
                type="number"
                min={1}
                value={draft.maxAddressesPerUser}
                disabled={disabled}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    maxAddressesPerUser: Number(event.target.value),
                  }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="ttl-hours">Address TTL hours</FieldLabel>
              <Input
                id="ttl-hours"
                type="number"
                min={1}
                value={draft.addressTtlHours}
                disabled={disabled}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    addressTtlHours: Number(event.target.value),
                  }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="refresh-seconds">
                Inbox refresh seconds
              </FieldLabel>
              <Input
                id="refresh-seconds"
                type="number"
                min={5}
                value={draft.inboxRefreshSeconds}
                disabled={disabled}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    inboxRefreshSeconds: Number(event.target.value),
                  }))
                }
              />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Feature Flags</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field orientation="horizontal">
              <FieldLabel htmlFor="guest-addresses">
                Allow guest addresses
              </FieldLabel>
              <Switch
                id="guest-addresses"
                checked={draft.allowGuestAddresses}
                disabled={disabled}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({
                    ...current,
                    allowGuestAddresses: checked,
                  }))
                }
              />
            </Field>
            <Field orientation="horizontal">
              <FieldLabel htmlFor="wildcard-subdomains">
                Allow wildcard subdomains
              </FieldLabel>
              <Switch
                id="wildcard-subdomains"
                checked={draft.allowWildcardSubdomains}
                disabled={disabled}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({
                    ...current,
                    allowWildcardSubdomains: checked,
                  }))
                }
              />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
      <DialogFooter>
        <Button type="submit" disabled={disabled}>
          {disabled ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <SaveIcon data-icon="inline-start" />
          )}
          Save Limits
        </Button>
      </DialogFooter>
    </form>
  )
}

function MetricLabel({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-muted/20 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  )
}
