import type { Domain } from "@/types"

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
  domainId: string,
  code: string
): Promise<Pick<Domain, "id" | "name" | "visibility" | "privateUntil">> {
  const res = await fetch("/api/vouchers/redeem", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domainId, code }),
  })
  const data = (await res.json().catch(() => null)) as {
    error?: string
    domain?: Pick<Domain, "id" | "name" | "visibility" | "privateUntil">
  } | null

  if (!res.ok) {
    throw new Error(data?.error ?? "Failed to redeem voucher")
  }

  if (!data?.domain) {
    throw new Error("Voucher response missing domain data")
  }

  return data.domain
}

export async function deleteDomain(id: string): Promise<void> {
  const res = await fetch(`/api/domains/${id}`, {
    method: "DELETE",
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to delete domain")
}
