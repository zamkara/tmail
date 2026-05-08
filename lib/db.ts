import mongoose from "mongoose"

const cached = global as typeof global & {
  mongoose?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
}

if (!cached.mongoose) {
  cached.mongoose = { conn: null, promise: null }
}

export async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URI
  if (!MONGODB_URI) throw new Error("MONGODB_URI tidak ditemukan di .env.local")

  if (cached.mongoose!.conn) return cached.mongoose!.conn

  if (!cached.mongoose!.promise) {
    cached.mongoose!.promise = mongoose.connect(MONGODB_URI)
  }

  cached.mongoose!.conn = await cached.mongoose!.promise
  return cached.mongoose!.conn
}
