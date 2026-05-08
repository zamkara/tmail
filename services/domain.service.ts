import type { Domain } from "@/types"

export async function getDomains(): Promise<Domain[]> {
  const res = await fetch("/api/domains")
  if (!res.ok) throw new Error("Gagal memuat domain")
  return res.json()
}

export async function addDomain(name: string): Promise<Domain> {
  const res = await fetch("/api/domains", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Gagal menambah domain")
  return data
}

export async function verifyDomain(name: string): Promise<void> {
  const res = await fetch("/api/domains/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Gagal verifikasi domain")
}

export async function updateDomain(id: string, name: string): Promise<Domain> {
  const res = await fetch(`/api/domains/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Gagal mengubah domain")
  return data
}

export async function deleteDomain(id: string): Promise<void> {
  const res = await fetch(`/api/domains/${id}`, {
    method: "DELETE",
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Gagal menghapus domain")
}
