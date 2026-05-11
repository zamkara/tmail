import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { MailboxState } from "@/models/mailbox-state.model"
import { getAuthUser } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const state = await MailboxState.findOne({ userId: user.userId })

    return NextResponse.json(
      state ?? {
        readIds: [],
        trashedIds: [],
        permanentlyDeletedIds: [],
        spamSenders: [],
      }
    )
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await req.json()) as {
      readIds?: string[]
      trashedIds?: string[]
      permanentlyDeletedIds?: string[]
      spamSenders?: string[]
    }

    await connectDB()

    const state = await MailboxState.findOneAndUpdate(
      { userId: user.userId },
      {
        $set: {
          readIds: body.readIds ?? [],
          trashedIds: body.trashedIds ?? [],
          permanentlyDeletedIds: body.permanentlyDeletedIds ?? [],
          spamSenders: body.spamSenders ?? [],
        },
      },
      { upsert: true, returnDocument: "after" }
    )

    return NextResponse.json(state)
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
