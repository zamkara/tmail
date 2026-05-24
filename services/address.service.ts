import type { GeneratedAddress } from "@/types"
import { buildBackendUrl, fetchBackendJson } from "@/services/backend.service"
import { useAddressStore } from "@/stores/address.store"

// Untuk user login: ambil dari API (tersimpan di DB)
export async function getAddresses(): Promise<GeneratedAddress[]> {
  const res = await fetch("/api/addresses")
  if (!res.ok) throw new Error("Failed to load addresses")
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
  if (!res.ok) throw new Error(data.error ?? "Failed to create address")

  const address = data?.address as GeneratedAddress | undefined
  const activeAddresses = data?.activeAddresses as GeneratedAddress[] | undefined

  if (!address) {
    throw new Error("Address response missing generated address")
  }

  if (Array.isArray(activeAddresses)) {
    useAddressStore.getState().setAddresses(activeAddresses)
  }

  return address
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

async function generateAddressViaBackend(
  domainId: string,
  domainName: string
): Promise<GeneratedAddress> {
  const target = buildBackendUrl(`/generate?domain=${encodeURIComponent(domainName)}`)
  if (!target) {
    return generateAddressLocally(domainId, domainName)
  }

  const data = await fetchBackendJson<{ email: string; domain: string }>(
    target.pathname + target.search
  )
  const now = new Date()

  return {
    id: `local_${Date.now()}`,
    address: data.email,
    domainId,
    domainName: data.domain || domainName,
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
  try {
    return await generateAddressViaBackend(domainId, domainName)
  } catch {
    return generateAddressLocally(domainId, domainName)
  }
}
