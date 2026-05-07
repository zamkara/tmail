import type { GeneratedAddress } from "@/types"

// Untuk user login: ambil dari API (tersimpan di DB)
export async function getAddresses(): Promise<GeneratedAddress[]> {
  const res = await fetch("/api/addresses")
  if (!res.ok) throw new Error("Gagal memuat alamat")
  return res.json()
}

// Untuk user login: generate via API (tersimpan di DB)
export async function generateAddressForUser(domainId: string): Promise<GeneratedAddress> {
  const res = await fetch("/api/addresses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domainId }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Gagal membuat alamat")
  return data
}

// Untuk guest: generate lokal, disimpan di localStorage via store
export function generateAddressLocally(domainId: string, domainName: string): GeneratedAddress {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  const random = Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("")
  const now = new Date()

  return {
    id: `local_${Date.now()}`,
    address: `${random}@${domainName}`,
    domainId,
    domainName,
    username: null,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
  }
}

// Fungsi utama yang dipakai komponen — otomatis pilih mode
export async function generateAddress(
  domainId: string,
  domainName: string,
  isLoggedIn = false
): Promise<GeneratedAddress> {
  if (isLoggedIn) return generateAddressForUser(domainId)
  return generateAddressLocally(domainId, domainName)
}
