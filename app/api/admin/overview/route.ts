import { NextResponse } from "next/server"
import mongoose from "mongoose"

import {
  DEFAULT_ADMIN_SETTINGS,
  getAdminSettings,
} from "@/lib/admin-settings"
import { isAdminRequest } from "@/lib/admin-session"
import { connectDB, hasMongoConfig } from "@/lib/db"
import { Address } from "@/models/address.model"
import { Domain } from "@/models/domain.model"
import { User } from "@/models/user.model"
import { Voucher } from "@/models/voucher.model"
import { resolveDomainSource } from "@/lib/domain-source"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    if (!(await isAdminRequest())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!hasMongoConfig()) {
      return NextResponse.json({
        stats: {
          users: 0,
          domains: 0,
          addresses: 0,
          activeAddresses: 0,
          vouchers: 0,
        },
        users: [],
        domains: [],
        addresses: [],
        vouchers: [],
        settings: DEFAULT_ADMIN_SETTINGS,
      })
    }

    await connectDB()

    const [
      totalUsers,
      totalDomains,
      totalAddresses,
      activeAddressCount,
      totalVouchers,
      users,
      domains,
      addresses,
      vouchers,
      settings,
    ] = await Promise.all([
      User.countDocuments({}),
      Domain.countDocuments({}),
      Address.countDocuments({}),
      Address.countDocuments({ expiresAt: { $gt: new Date() } }),
      Voucher.countDocuments({}),
      User.find({})
        .sort({ createdAt: -1 })
        .select("_id name email isBanned banReason createdAt updatedAt")
        .lean(),
      Domain.find({})
        .sort({ createdAt: -1 })
        .select(
          "_id name type isVerified visibility privateUntil isBanned banReason userId createdAt updatedAt"
        )
        .lean(),
      Address.find({})
        .sort({ createdAt: -1 })
        .select("_id address userId domainId expiresAt createdAt updatedAt")
        .lean(),
      Voucher.find({})
        .sort({ createdAt: -1 })
        .select(
          "_id code durationDays privateDomainLimit maxUses usedCount expiresAt isActive note createdAt updatedAt"
        )
        .lean(),
      getAdminSettings(),
    ])

    const ownerIds = domains
      .map((domain) => domain.userId)
      .filter((userId): userId is mongoose.Types.ObjectId =>
        Boolean(userId && mongoose.isValidObjectId(userId))
      )
    const owners = ownerIds.length
      ? await User.find({ _id: { $in: ownerIds } })
          .select("_id name email")
          .lean()
      : []
    const ownerMap = new Map(
      owners.map((owner) => [
        owner._id.toString(),
        {
          id: owner._id.toString(),
          name: owner.name,
          email: owner.email,
        },
      ])
    )
    const addressUserIds = addresses
      .map((address) => address.userId)
      .filter((userId): userId is mongoose.Types.ObjectId =>
        Boolean(userId && mongoose.isValidObjectId(userId))
      )
    const addressDomainIds = addresses
      .map((address) => address.domainId)
      .filter((domainId): domainId is mongoose.Types.ObjectId =>
        Boolean(domainId && mongoose.isValidObjectId(domainId))
      )
    const [addressUsers, addressDomains] = await Promise.all([
      addressUserIds.length
        ? User.find({ _id: { $in: addressUserIds } })
            .select("_id name email")
            .lean()
        : [],
      addressDomainIds.length
        ? Domain.find({ _id: { $in: addressDomainIds } })
            .select("_id name type source userId")
            .lean()
        : [],
    ])
    const addressUserMap = new Map(
      addressUsers.map((user) => [
        user._id.toString(),
        {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        },
      ])
    )
    const addressDomainMap = new Map(
      addressDomains.map((domain) => [
        domain._id.toString(),
        {
          id: domain._id.toString(),
          name: domain.name,
          type: domain.type,
          source: resolveDomainSource(domain),
        },
      ])
    )

    return NextResponse.json({
      stats: {
        users: totalUsers,
        domains: totalDomains,
        addresses: totalAddresses,
        activeAddresses: activeAddressCount,
        vouchers: totalVouchers,
      },
      users: users.map((user) => ({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        isBanned: user.isBanned ?? false,
        banReason: user.banReason ?? "",
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
      domains: domains.map((domain) => {
        const owner = domain.userId
          ? (ownerMap.get(domain.userId.toString()) ?? null)
          : null

        return {
          id: domain._id.toString(),
          name: domain.name,
          type: domain.type,
          source: resolveDomainSource(domain),
          isVerified: domain.isVerified,
          visibility: domain.visibility ?? "public",
          privateUntil: domain.privateUntil,
          isBanned: domain.isBanned ?? false,
          banReason: domain.banReason ?? "",
          owner,
          createdAt: domain.createdAt,
          updatedAt: domain.updatedAt,
        }
      }),
      addresses: addresses.map((address) => ({
        id: address._id.toString(),
        address: address.address,
        userId: address.userId.toString(),
        domainId: address.domainId.toString(),
        user: addressUserMap.get(address.userId.toString()) ?? null,
        domain: addressDomainMap.get(address.domainId.toString()) ?? null,
        expiresAt: address.expiresAt,
        createdAt: address.createdAt,
        updatedAt: address.updatedAt,
      })),
      vouchers: vouchers.map((voucher) => ({
        id: voucher._id.toString(),
        code: voucher.code,
        durationDays: voucher.durationDays,
        privateDomainLimit: voucher.privateDomainLimit ?? 1,
        maxUses: voucher.maxUses,
        usedCount: voucher.usedCount,
        expiresAt: voucher.expiresAt,
        isActive: voucher.isActive,
        note: voucher.note,
        createdAt: voucher.createdAt,
        updatedAt: voucher.updatedAt,
      })),
      settings,
    })
  } catch (error) {
    console.error("[admin/overview]", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load admin data",
      },
      { status: 500 }
    )
  }
}
