"use client"

import GuestNavbar from "@/components/guest/guest-navbar"
import GuestMailWorkspace from "@/components/guest/guest-mail-workspace"
import Aurora from "@/components/shared/aurora"
import { useAuroraStore } from "@/stores/aurora.store"

export default function HomePage() {
  const auroraVisible = useAuroraStore((state) => state.visible)

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-muted dark:bg-background">
      {auroraVisible && (
        <Aurora
          darkColorStops={["#dc67ff", "#420e73", "#420e73"]}
          lightColorStops={["#eeddff", "#d1bfe6", "#c0a4da"]}
          darkBlend={0.9}
          lightBlend={0.85}
          amplitude={0.5}
          speed={0.1}
        />
      )}
      <GuestNavbar />
      <main className="relative z-10 min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        <GuestMailWorkspace />
      </main>
    </div>
  )
}
