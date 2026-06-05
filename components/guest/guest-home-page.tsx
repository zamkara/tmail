"use client"

import dynamic from "next/dynamic"
import { type PointerEvent, useEffect, useRef, useState } from "react"

import Aurora from "@/components/shared/aurora"
import DesktopOnly from "@/components/shared/desktop-only"
import ShootingStars from "@/components/shared/shooting-stars"
import { cn } from "@/lib/utils"
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
  const auroraColorStops = useAuroraStore((state) => state.colorStops)
  const [backgroundVisible, setBackgroundVisible] = useState(true)
  const restoreBackgroundTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  useEffect(() => {
    return () => {
      if (restoreBackgroundTimeoutRef.current) {
        clearTimeout(restoreBackgroundTimeoutRef.current)
      }
    }
  }, [])

  function handleBackgroundPointerDown(event: PointerEvent<HTMLDivElement>) {
    const target = event.target
    if (!(target instanceof Element)) return
    if (target.closest("[data-guest-interactive='true']")) return

    setBackgroundVisible(false)
    if (restoreBackgroundTimeoutRef.current) {
      clearTimeout(restoreBackgroundTimeoutRef.current)
    }
    restoreBackgroundTimeoutRef.current = setTimeout(() => {
      setBackgroundVisible(true)
      restoreBackgroundTimeoutRef.current = null
    }, 5000)
  }

  return (
    <div
      className="group relative flex min-h-svh flex-col bg-muted dark:bg-background"
      onPointerDown={handleBackgroundPointerDown}
    >
      <DesktopOnly>
        <>
          <ShootingStars
            className={cn(
              "transition-opacity duration-700 ease-out",
              backgroundVisible ? "opacity-100 duration-[4000ms]" : "opacity-0"
            )}
          />
          {auroraVisible && (
            <div
              className={cn(
                "pointer-events-none absolute inset-0 hidden transition-opacity duration-700 ease-out dark:block",
                backgroundVisible
                  ? "opacity-100 duration-[4000ms]"
                  : "opacity-0"
              )}
            >
              <Aurora
                darkColorStops={auroraColorStops}
                lightColorStops={["#eeddff", "#d1bfe6", "#c0a4da"]}
                darkBlend={0.9}
                lightBlend={0.85}
                amplitude={0.5}
                speed={0.1}
              />
            </div>
          )}
        </>
      </DesktopOnly>
      <div className="contents" data-guest-interactive="true">
        <GuestNavbar />
      </div>
      <main className="relative z-10 flex flex-1 flex-col items-center p-4 md:p-6">
        <div className="contents" data-guest-interactive="true">
          <GuestMailWorkspace initialEmail={initialEmail} />
        </div>
      </main>
    </div>
  )
}
