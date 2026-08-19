import type mongoose from "mongoose"

import type { AppAdminSettings } from "@/lib/admin-settings"
import { resolveDomainSource } from "@/lib/domain-source"
import { Address } from "@/models/address.model"

type DomainOwnershipInput = {
  _id?: mongoose.Types.ObjectId | string | null
  userId?: mongoose.Types.ObjectId | string | null
  source?: "system" | "user" | "guest" | null
  type?: "system" | "custom"
}

type AddressConflictOptions = {
  address: string
  userId: string
  settings: AppAdminSettings
  domain: DomainOwnershipInput
  excludeAddressId?: string | null
}

let indexSyncPromise: Promise<void> | null = null

export async function ensureAddressIndexes() {
  if (!indexSyncPromise) {
    indexSyncPromise = (async () => {
      const indexes = await Address.collection.indexes()
      const legacyGlobalIndex = indexes.find(
        (index) =>
          index.name === "address_1" &&
          index.unique === true &&
          Object.keys(index.key ?? {}).length === 1 &&
          index.key?.address === 1
      )

      if (legacyGlobalIndex?.name) {
        await Address.collection.dropIndex(legacyGlobalIndex.name).catch((error) => {
          const message = error instanceof Error ? error.message : String(error)
          if (!message.includes("index not found")) {
            throw error
          }
        })
      }

      const nextIndexes = await Address.collection.indexes()
      const hasScopedUniqueIndex = nextIndexes.some(
        (index) =>
          index.name === "address_1_userId_1" &&
          index.unique === true &&
          index.key?.address === 1 &&
          index.key?.userId === 1
      )

      if (!hasScopedUniqueIndex) {
        await Address.collection.createIndex(
          { address: 1, userId: 1 },
          { unique: true, name: "address_1_userId_1" }
        )
      }
    })().finally(() => {
      indexSyncPromise = null
    })
  }

  await indexSyncPromise
}

export function canShareAddressAcrossUsers(
  settings: AppAdminSettings,
  domain: DomainOwnershipInput,
  userId: string
) {
  if (settings.enforceGlobalAddressUniqueness) return false
  if (resolveDomainSource(domain) !== "user") return false

  return Boolean(domain.userId && domain.userId.toString() === userId)
}

export async function findAddressConflict({
  address,
  userId,
  settings,
  domain,
  excludeAddressId = null,
}: AddressConflictOptions) {
  const scopeQuery = canShareAddressAcrossUsers(settings, domain, userId)
    ? { address, userId }
    : { address }

  const query = excludeAddressId
    ? { ...scopeQuery, _id: { $ne: excludeAddressId } }
    : scopeQuery

  return Address.findOne(query).select("_id userId").lean()
}
