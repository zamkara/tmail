"use client"

import dynamic from "next/dynamic"

import Aurora from "@/components/shared/aurora"
import DesktopOnly from "@/components/shared/desktop-only"
import ShootingStars from "@/components/shared/shooting-stars"
import { useAuroraStore } from "@/stores/aurora.store"

const GuestNavbar = dynamic(
  () => import("@/components/guest/guest-navbar"),
  { ssr: false }
)

const GuestMailWorkspace = dynamic(
  () => import("@/components/guest/guest-mail-workspace"),
  { ssr: false }
)

export default function GuestHomePage({
  initialEmail,
}: {
  initialEmail?: string
}) {
  const auroraVisible = useAuroraStore((state) => state.visible)

  return (
    <div className="group relative flex min-h-svh flex-col overflow-hidden bg-muted dark:bg-background">
      <DesktopOnly>
        <ShootingStars />
        {auroraVisible && (
          <div className="hidden dark:block">
            <Aurora
              darkColorStops={["#dc67ff", "#420e73", "#420e73"]}
              lightColorStops={["#eeddff", "#d1bfe6", "#c0a4da"]}
              darkBlend={0.9}
              lightBlend={0.85}
              amplitude={0.5}
              speed={0.1}
            />
          </div>
        )}
      </DesktopOnly>
      <GuestNavbar />
      <main className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto p-4 md:p-6">
        <GuestMailWorkspace initialEmail={initialEmail} />
      </main>
    </div>
  )
}
