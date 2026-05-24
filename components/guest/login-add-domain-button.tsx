"use client"

import { type ComponentProps, useEffect, useState } from "react"
import { LogIn, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface LoginAddDomainButtonProps
  extends Omit<ComponentProps<typeof Button>, "children"> {
  mobileIconOnly?: boolean
}

export default function LoginAddDomainButton({
  mobileIconOnly = false,
  className,
  ...props
}: LoginAddDomainButtonProps) {
  const [showLogin, setShowLogin] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setShowLogin((prev) => !prev)
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  return (
    <Button
      type="button"
      variant="default"
      size="default"
      className={cn("relative overflow-hidden", className)}
      aria-label="Login or add domain"
      {...props}
    >
      {mobileIconOnly ? (
        <span className="sm:hidden">
          {showLogin ? <LogIn className="size-4" /> : <Plus className="size-4" />}
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
    </Button>
  )
}
