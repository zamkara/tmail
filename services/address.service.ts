import { mockAddresses } from "@/mock/addresses"
import type { GeneratedAddress } from "@/types"

export async function getAddresses(): Promise<GeneratedAddress[]> {
  return Promise.resolve(mockAddresses)
}

export async function generateAddress(
  domainId: string,
  domainName: string
): Promise<GeneratedAddress> {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  const random = Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("")
  const now = new Date()

  return Promise.resolve({
    id: `addr_${Date.now()}`,
    address: `${random}@${domainName}`,
    domainId,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
  })
}
