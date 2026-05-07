import { NextResponse } from "next/server"

import { getAuthUser } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { Address } from "@/models/address.model"
import { Domain } from "@/models/domain.model"
import { User } from "@/models/user.model"

// GET /api/addresses — ambil semua address milik user yang belum expired
export async function GET() {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await connectDB()

  const user = await User.findById(auth.userId)
  if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 })

  const addresses = await Address.find({
    userId: auth.userId,
    expiresAt: { $gt: new Date() },
  }).lean()

  return NextResponse.json(
    addresses.map((a) => ({
      id: a._id.toString(),
      address: a.address,
      domainId: a.domainId.toString(),
      domainName: a.address.split("@")[1] ?? "",
      username: slugify(user.name),
      createdAt: a.createdAt,
      expiresAt: a.expiresAt,
    }))
  )
}

// POST /api/addresses — generate address baru untuk domain tertentu
export async function POST(req: Request) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { domainId } = await req.json()
  if (!domainId) return NextResponse.json({ error: "domainId wajib diisi" }, { status: 400 })

  await connectDB()

  const isSystem = domainId.startsWith("sys_")
  let domain
  if (isSystem) {
    const name = domainId.replace(/^sys_\d+_/, "")
    domain = await Domain.findOne({ name, type: "system" })
    if (!domain) {
      domain = await Domain.create({ name, type: "system", isVerified: true, userId: null })
    }
  } else {
    domain = await Domain.findOne({
      _id: domainId,
      $or: [{ type: "system" }, { userId: auth.userId }],
    })
  }

  if (!domain) return NextResponse.json({ error: "Domain tidak ditemukan" }, { status: 404 })

  const user = await User.findById(auth.userId)
  if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 })

  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  const random = Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("")

  const now = new Date()
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const address = await Address.create({
    address: `${random}@${domain.name}`,
    domainId: domain._id,
    userId: auth.userId,
    expiresAt,
  })

  return NextResponse.json({
    id: address._id.toString(),
    address: address.address,
    domainId: isSystem ? domainId : address.domainId.toString(),
    domainName: domain.name,
    username: slugify(user.name),
    createdAt: address.createdAt,
    expiresAt: address.expiresAt,
  })
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}
