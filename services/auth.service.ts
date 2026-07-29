export interface AuthUser {
  id: string
  name: string
  email: string
  avatarPreset: string | null
  isPremium: boolean
  premiumUntil: string | null
  premiumPrivateDomainLimit: number
  apiKeyPrefix: string | null
  apiKeyAllowAllIps: boolean
  apiKeyAllowedIps: string[]
  apiKeyBlockedIps: string[]
}

export async function register(
  name: string,
  email: string,
  password: string,
  turnstileToken?: string
): Promise<AuthUser> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, turnstileToken }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to register")
  return data.user
}

export async function login(
  email: string,
  password: string,
  turnstileToken?: string
): Promise<AuthUser> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, turnstileToken }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to sign in")
  return data.user
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" })
}

export async function getMe(): Promise<AuthUser | null> {
  const res = await fetch("/api/auth/me")
  if (!res.ok) return null
  const data = await res.json()
  return data.user
}

export async function generateApiKey(): Promise<{
  apiKey: string
  apiKeyPrefix: string
  user: AuthUser
}> {
  const res = await fetch("/api/auth/api-key", { method: "POST" })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to generate API key")
  return data
}

export async function getApiKey(): Promise<{
  apiKey: string | null
  apiKeyPrefix: string | null
  user: AuthUser
}> {
  const res = await fetch("/api/auth/api-key", { cache: "no-store" })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to load API key")
  return data
}

export async function updateApiKeyAccess(input: {
  allowAllIps: boolean
  allowedIps: string[]
  blockedIps: string[]
}): Promise<{ user: AuthUser }> {
  const res = await fetch("/api/auth/api-key", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to update API key access")
  return data
}

export async function updateProfile(input: {
  name: string
  email: string
  password?: string
  avatarPreset: string | null
}): Promise<{ user: AuthUser }> {
  const res = await fetch("/api/auth/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to update profile")
  return data
}
