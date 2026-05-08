export const DOMAIN_PATTERN =
  /^(?=.{4,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/

export const MAIL_SERVER_HOST =
  process.env.MAIL_SERVER_HOST ??
  process.env.NEXT_PUBLIC_MAIL_SERVER_HOST ??
  "mx.thvuinin.my.id"

export function normalizeDomain(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

export function normalizeDnsHost(value: string) {
  return value.trim().toLowerCase().replace(/\.$/, "")
}

export function isValidDomain(value: string) {
  return DOMAIN_PATTERN.test(value)
}

export function getMxVerificationError(
  records: Array<{ exchange: string; priority: number }>,
  expectedHost = MAIL_SERVER_HOST
) {
  const expected = normalizeDnsHost(expectedHost)
  const normalizedRecords = records.map((record) => ({
    ...record,
    exchange: normalizeDnsHost(record.exchange),
  }))

  if (normalizedRecords.length === 0) {
    return `MX record belum ditemukan. Buat MX ke ${expected}, lalu coba verifikasi lagi setelah DNS aktif.`
  }

  const expectedRecords = normalizedRecords.filter(
    (record) => record.exchange === expected
  )

  if (expectedRecords.length === 0) {
    return `MX domain belum mengarah ke ${expected}`
  }

  const competingRecords = normalizedRecords.filter(
    (record) => record.exchange !== expected
  )

  if (competingRecords.length > 0) {
    return `Masih ada MX lain di domain ini. Hapus MX lain atau gunakan subdomain khusus seperti inbox.example.com.`
  }

  return null
}
