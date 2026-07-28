import { getClientIpAddress } from "@/lib/login-audit"

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify"
const TURNSTILE_TIMEOUT_MS = 8000

export function isTurnstileEnabled() {
  return Boolean(
    process.env.TURNSTILE_SECRET?.trim() &&
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()
  )
}

export async function verifyTurnstileToken(
  req: Request,
  token: string | null | undefined
) {
  if (!isTurnstileEnabled()) {
    return { ok: true }
  }

  if (!token?.trim()) {
    return {
      ok: false,
      error: "Verifikasi anti-bot wajib diselesaikan",
    }
  }

  const formData = new URLSearchParams()
  formData.set("secret", process.env.TURNSTILE_SECRET!.trim())
  formData.set("response", token.trim())

  const clientIp = getClientIpAddress(req)
  if (clientIp) {
    formData.set("remoteip", clientIp)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TURNSTILE_TIMEOUT_MS)

  let response: Response

  try {
    response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
      cache: "no-store",
      signal: controller.signal,
    })
  } catch {
    return {
      ok: false,
      error: "Verifikasi anti-bot gagal. Refresh halaman lalu coba lagi.",
    }
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    return {
      ok: false,
      error: "Verifikasi anti-bot gagal. Refresh halaman lalu coba lagi.",
    }
  }

  const data = (await response.json()) as {
    success?: boolean
    "error-codes"?: string[]
  }

  if (!data.success) {
    const codes = data["error-codes"] ?? []

    if (
      codes.includes("timeout-or-duplicate") ||
      codes.includes("invalid-input-response")
    ) {
      return {
        ok: false,
        error:
          "Verifikasi anti-bot sudah kedaluwarsa atau sudah terpakai. Refresh halaman lalu centang ulang.",
        codes,
      }
    }

    return {
      ok: false,
      error: "Verifikasi anti-bot gagal. Refresh halaman lalu coba lagi.",
      codes,
    }
  }

  return { ok: true }
}
