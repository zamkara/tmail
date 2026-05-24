import { resolveMx } from "node:dns/promises"
import { NextResponse } from "next/server"

import {
  getMxVerificationError,
  isValidDomain,
  MAIL_SERVER_HOST,
  normalizeDnsHost,
  normalizeDomain,
} from "@/lib/domain-validation"

export async function POST(req: Request) {
  const { name } = await req.json()
  const normalized = normalizeDomain(name)

  if (!normalized || !isValidDomain(normalized)) {
    return NextResponse.json(
      { error: "Format domain tidak valid" },
      { status: 400 }
    )
  }

  const expected = normalizeDnsHost(MAIL_SERVER_HOST)

  try {
    const records = await resolveMx(normalized)
    const error = getMxVerificationError(records, expected)

    if (error) {
      return NextResponse.json(
        {
          error,
          expected,
          records,
          verified: false,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      expected,
      records,
      verified: true,
    })
  } catch {
    return NextResponse.json(
      {
        error: `MX record not found. Point your MX to ${expected}, then try verifying again after DNS propagates.`,
        expected,
        records: [],
        verified: false,
      },
      { status: 400 }
    )
  }
}
