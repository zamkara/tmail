import type { Domain } from "@/types"
import type { AuthUser } from "@/services/auth.service"

async function readError(res: Response) {
  const data = (await res.json().catch(() => null)) as { error?: string } | null
  return data?.error ?? "Failed to load domains"
}

export async function getDomains(): Promise<Domain[]> {
  const res = await fetch("/api/domains", {
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error(await readError(res))
  }

  return res.json()
}

export async function addDomain(name: string): Promise<Domain> {
  const res = await fetch("/api/domains", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to add domain")
  return data
}

export async function verifyDomain(name: string): Promise<void> {
  const res = await fetch("/api/domains/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to verify domain")
}

export async function updateDomain(id: string, name: string): Promise<Domain> {
  const res = await fetch(`/api/domains/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to update domain")
  return data
}

export async function setDomainVisibility(
  id: string,
  visibility: "public" | "private"
): Promise<Domain> {
  const res = await fetch(`/api/domains/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visibility }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to update domain access")
  return data
}

export async function redeemDomainVoucher(
  code: string
): Promise<{
  user: AuthUser
}> {
  const res = await fetch("/api/vouchers/redeem", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  })
  const data = (await res.json().catch(() => null)) as {
    error?: string
    user?: AuthUser
  } | null

  if (!res.ok) {
    throw new Error(data?.error ?? "Failed to redeem voucher")
  }

  if (!data?.user) {
    throw new Error("Voucher response missing user data")
  }

  return { user: data.user }
}

export async function deleteDomain(id: string): Promise<void> {
  const res = await fetch(`/api/domains/${id}`, {
    method: "DELETE",
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to delete domain")
}
