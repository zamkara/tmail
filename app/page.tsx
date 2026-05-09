"use client"

import GuestNavbar from "@/components/guest/guest-navbar"
import GuestMailWorkspace from "@/components/guest/guest-mail-workspace"
import Aurora from "@/components/shared/aurora"
import PixelBlast from "@/components/shared/pixel-blast"
import { useAuroraStore } from "@/stores/aurora.store"

export default function HomePage() {
  const auroraVisible = useAuroraStore((state) => state.visible)

  return (
    <div className="group relative flex min-h-svh flex-col overflow-hidden bg-muted dark:bg-background">
      <PixelBlast
        className="pointer-events-none translate-x-28 translate-y-12 scale-110 opacity-0 transition-all delay-500 duration-1000 ease-in-out group-hover:opacity-100 dark:group-hover:opacity-50"
        variant="circle"
        pixelSize={4}
        color="#a855f7"
        patternScale={3}
        patternDensity={1.2}
        pixelSizeJitter={4}
        enableRipples
        rippleSpeed={0.4}
        rippleThickness={10}
        rippleIntensityScale={1.5}
        liquid
        liquidStrength={0.12}
        liquidRadius={1.2}
        liquidWobbleSpeed={5}
        speed={0.6}
        edgeFade={0}
        transparent
      />
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
      <GuestNavbar />
      <main className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto p-4 md:p-6">
        <GuestMailWorkspace />
      </main>
    </div>
  )
}
