import { NextResponse } from "next/server"

import { isAdminRequest } from "@/lib/admin-session"
import { connectDB, hasMongoConfig } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!hasMongoConfig()) {
    return NextResponse.json({
      ok: false,
      error: "MONGODB_URI tidak dikonfigurasi",
    })
  }

  try {
    const mongoose = await connectDB()
    const ping = await mongoose.connection.db?.admin().ping()

    return NextResponse.json({
      ok: true,
      db: mongoose.connection.name,
      host: mongoose.connection.host,
      ping,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "MongoDB health check failed",
      },
      { status: 500 }
    )
  }
}
