import type { Domain } from "@/types"

const GET_DOMAINS_TIMEOUT_MS = 8000

export async function getDomains(): Promise<Domain[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), GET_DOMAINS_TIMEOUT_MS)

  try {
    const res = await fetch("/api/domains", {
      signal: controller.signal,
      cache: "no-store",
    })
    if (!res.ok) throw new Error("Failed to load domains")
    return res.json()
  } catch (error) {
    console.error("Failed to fetch domains:", error)
    throw error
  } finally {
    clearTimeout(timeout)
  }
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

export async function deleteDomain(id: string): Promise<void> {
  const res = await fetch(`/api/domains/${id}`, {
    method: "DELETE",
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to delete domain")
}
