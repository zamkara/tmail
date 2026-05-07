import { NextResponse } from "next/server"

import { getAuthUser } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { Address } from "@/models/address.model"
import { Domain } from "@/models/domain.model"

// GET /api/addresses — ambil semua address milik user yang belum expired
export async function GET() {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await connectDB()

  const addresses = await Address.find({
    userId: auth.userId,
    expiresAt: { $gt: new Date() },
  }).lean()

  return NextResponse.json(
    addresses.map((a) => ({
      id: a._id.toString(),
      address: a.address,
      domainId: a.domainId.toString(),
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

  const domain = await Domain.findOne({
    _id: domainId,
    $or: [{ type: "system" }, { userId: auth.userId }],
  })

  if (!domain) return NextResponse.json({ error: "Domain tidak ditemukan" }, { status: 404 })

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
    domainId: address.domainId.toString(),
    createdAt: address.createdAt,
    expiresAt: address.expiresAt,
  })
}
