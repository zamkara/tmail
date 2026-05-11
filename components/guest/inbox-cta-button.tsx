"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { LogIn, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"

interface InboxCtaButtonProps {
  mobileIconOnly?: boolean
  className?: string
}

export default function InboxCtaButton({
  mobileIconOnly = false,
  className,
}: InboxCtaButtonProps) {
  const [showLogin, setShowLogin] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setShowLogin((prev) => !prev)
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  return (
    <Button
      variant="default"
      size="default"
      asChild
      className={className}
    >
      <Link href="/inbox" className="relative overflow-hidden">
        {mobileIconOnly ? (
          <span className="sm:hidden">
            {showLogin ? (
              <LogIn className="size-4" />
            ) : (
              <Plus className="size-4" />
            )}
          </span>
        ) : null}
        <span
          className={`items-center gap-2 ${
            mobileIconOnly ? "hidden sm:flex" : "flex"
          }`}
        >
          {showLogin ? <LogIn className="size-4" /> : <Plus className="size-4" />}
          <span className="relative h-5 w-22 overflow-hidden">
            <span
              className={`absolute inset-0 flex items-center transition-all duration-500 ${
                showLogin
                  ? "translate-y-0 opacity-100"
                  : "-translate-y-full opacity-0"
              }`}
            >
              Login
            </span>
            <span
              className={`absolute inset-0 flex items-center transition-all duration-500 ${
                showLogin
                  ? "translate-y-full opacity-0"
                  : "translate-y-0 opacity-100"
              }`}
            >
              Add Domain
            </span>
          </span>
        </span>
      </Link>
    </Button>
  )
}
