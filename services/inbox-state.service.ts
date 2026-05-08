"use client"

export interface ServerInboxState {
  readIds: string[]
  trashedIds: string[]
  permanentlyDeletedIds: string[]
  spamSenders: string[]
}

export async function fetchInboxState(): Promise<ServerInboxState | null> {
  try {
    const res = await fetch("/api/inbox/state")
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function syncInboxState(
  state: ServerInboxState
): Promise<boolean> {
  try {
    const res = await fetch("/api/inbox/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    })
    return res.ok
  } catch {
    return false
  }
}
