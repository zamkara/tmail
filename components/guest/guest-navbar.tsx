"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { LogIn, Plus } from "lucide-react"

import DomainAddressSwitcher from "@/components/guest/domain-address-switcher"
import ModeToggle from "@/components/shared/mode-toggle"
import { Button } from "@/components/ui/button"

export default function GuestNavbar() {
  const [showLogin, setShowLogin] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setShowLogin((prev) => !prev)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center">
      <nav
        aria-label="Main navigation"
        className="mx-auto grid size-full max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6 lg:px-0"
      >
        <div className="col-start-2">
          <DomainAddressSwitcher />
        </div>
        <div className="flex items-center gap-2 justify-self-end">
          <ModeToggle />
          <Button asChild variant="default" className="justify-self-end">
            <Link href="/inbox" className="relative overflow-hidden">
              {showLogin ? (
                <LogIn className="size-4" />
              ) : (
                <Plus className="size-4" />
              )}
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
            </Link>
          </Button>
        </div>
      </nav>
    </header>
  )
}
