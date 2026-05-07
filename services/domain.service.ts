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
