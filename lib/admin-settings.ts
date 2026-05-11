import { AdminSettings } from "@/models/admin-settings.model"

export interface AppAdminSettings {
  maxAddressesPerUser: number
  addressTtlHours: number
  allowGuestAddresses: boolean
  allowWildcardSubdomains: boolean
  inboxRefreshSeconds: number
}

export const DEFAULT_ADMIN_SETTINGS: AppAdminSettings = {
  maxAddressesPerUser: 10,
  addressTtlHours: 24,
  allowGuestAddresses: true,
  allowWildcardSubdomains: true,
  inboxRefreshSeconds: 15,
}

export async function getAdminSettings() {
  const settings = await AdminSettings.findOneAndUpdate(
    { key: "default" },
    { $setOnInsert: { key: "default", ...DEFAULT_ADMIN_SETTINGS } },
    { returnDocument: "after", upsert: true }
  ).lean()

  return {
    maxAddressesPerUser: settings.maxAddressesPerUser,
    addressTtlHours: settings.addressTtlHours,
    allowGuestAddresses: settings.allowGuestAddresses,
    allowWildcardSubdomains: settings.allowWildcardSubdomains,
    inboxRefreshSeconds: settings.inboxRefreshSeconds,
  }
}

export function normalizeAdminSettingsPatch(value: unknown) {
  const body = value && typeof value === "object" ? value : {}
  const input = body as Partial<AppAdminSettings>
  const patch: Partial<AppAdminSettings> = {}

  if (typeof input.maxAddressesPerUser === "number") {
    patch.maxAddressesPerUser = Math.min(
      1000,
      Math.max(1, Math.floor(input.maxAddressesPerUser))
    )
  }

  if (typeof input.addressTtlHours === "number") {
    patch.addressTtlHours = Math.min(
      24 * 30,
      Math.max(1, Math.floor(input.addressTtlHours))
    )
  }

  if (typeof input.allowGuestAddresses === "boolean") {
    patch.allowGuestAddresses = input.allowGuestAddresses
  }

  if (typeof input.allowWildcardSubdomains === "boolean") {
    patch.allowWildcardSubdomains = input.allowWildcardSubdomains
  }

  if (typeof input.inboxRefreshSeconds === "number") {
    patch.inboxRefreshSeconds = Math.min(
      300,
      Math.max(5, Math.floor(input.inboxRefreshSeconds))
    )
  }

  return patch
}
