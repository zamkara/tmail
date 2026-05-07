import { connectDB } from "@/lib/db"
import { Domain } from "@/models/domain.model"

const SYSTEM_DOMAINS = ["tmail.io", "tmpbox.net", "throwmail.dev"]

export async function seedSystemDomains() {
  await connectDB()

  for (const name of SYSTEM_DOMAINS) {
    await Domain.updateOne(
      { name, type: "system" },
      { $setOnInsert: { name, type: "system", isVerified: true, userId: null } },
      { upsert: true }
    )
  }
}
