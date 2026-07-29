export const PROFILE_AVATAR_PRESETS = [
  { id: "prem-cute", label: "Prem Cute", src: "/Prem-Cute.webp" },
  { id: "prem-king", label: "Prem King", src: "/Prem-King.webp" },
] as const

export type ProfileAvatarPreset =
  (typeof PROFILE_AVATAR_PRESETS)[number]["id"]

export function isProfileAvatarPreset(
  value: string | null | undefined
): value is ProfileAvatarPreset {
  return PROFILE_AVATAR_PRESETS.some((preset) => preset.id === value)
}

export function getProfileAvatarSrc(
  value: string | null | undefined
): string | null {
  return (
    PROFILE_AVATAR_PRESETS.find((preset) => preset.id === value)?.src ?? null
  )
}
