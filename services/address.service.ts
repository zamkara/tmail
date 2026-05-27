import type { GeneratedAddress } from "@/types"
import { useAddressStore } from "@/stores/address.store"

// Untuk user login: ambil dari API (tersimpan di DB)
export async function getAddresses(): Promise<GeneratedAddress[]> {
  const res = await fetch("/api/addresses")
  if (!res.ok) throw new Error("Failed to load addresses")
  return res.json()
}

// Untuk user login: generate via API (tersimpan di DB)
export async function generateAddressForUser(
  domainId: string,
  subdomain = ""
): Promise<GeneratedAddress> {
  const res = await fetch("/api/addresses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domainId, subdomain }),
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

export async function deleteAddress(addressId: string): Promise<void> {
  const res = await fetch(`/api/addresses/${addressId}`, {
    method: "DELETE",
  })
  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(data?.error ?? "Failed to delete address")
  }
}

export async function updateAddressLocalPart(
  addressId: string,
  localPart: string,
  subdomain = ""
): Promise<GeneratedAddress> {
  const res = await fetch(`/api/addresses/${addressId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ localPart, subdomain }),
  })
  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(data?.error ?? "Failed to update address")
  }

  return data as GeneratedAddress
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
  isLoggedIn = false,
  subdomain = ""
): Promise<GeneratedAddress> {
  if (isLoggedIn) return generateAddressForUser(domainId, subdomain)
  const resolvedDomain = subdomain ? `${subdomain}.${domainName}` : domainName
  return generateAddressLocally(domainId, resolvedDomain)
}
