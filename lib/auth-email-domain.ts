const ALLOWED_REGISTER_EMAIL_DOMAINS = [
  "gmail.com",
  "hotmail.com",
  "outlook.com",
] as const

export function getAllowedRegisterEmailDomains() {
  return [...ALLOWED_REGISTER_EMAIL_DOMAINS]
}

export function isAllowedRegisterEmailDomain(email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const domain = normalizedEmail.split("@")[1] ?? ""
  return ALLOWED_REGISTER_EMAIL_DOMAINS.includes(
    domain as (typeof ALLOWED_REGISTER_EMAIL_DOMAINS)[number]
  )
}
