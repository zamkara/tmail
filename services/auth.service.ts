export interface AuthUser {
  id: string
  name: string
  email: string
}

export async function register(name: string, email: string, password: string): Promise<AuthUser> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to register")
  return data.user
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
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
