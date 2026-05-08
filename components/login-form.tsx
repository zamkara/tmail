"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { login, register } from "@/services/auth.service"
import { useAuthStore } from "@/stores/auth.store"

export function LoginForm({
  className,
  mode = "signin",
  ...props
}: React.ComponentProps<"div"> & { mode?: "signin" | "signup" }) {
  const isSignup = mode === "signup"
  const router = useRouter()
  const setUser = useAuthStore((s) => s.setUser)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const email = form.get("email") as string
    const password = form.get("password") as string

    setIsLoading(true)
    try {
      if (isSignup) {
        const name = form.get("name") as string
        const user = await register(name, email, password)
        setUser(user)
      } else {
        const user = await login(email, password)
        setUser(user)
      }
      router.push("/inbox")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={(e) => void handleSubmit(e)}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">
                  {isSignup ? "Create account" : "Welcome back"}
                </h1>
                <p className="text-balance text-muted-foreground">
                  {isSignup
                    ? "Sign up with email and password"
                    : "Sign in with email and password"}
                </p>
              </div>
              {isSignup && (
                <Field>
                  <FieldLabel htmlFor="name">Name</FieldLabel>
                  <Input id="name" name="name" type="text" placeholder="Full name" required />
                </Field>
              )}
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" name="email" type="email" placeholder="m@example.com" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input id="password" name="password" type="password" required minLength={8} />
              </Field>
              <Field>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Spinner /> : isSignup ? "Sign Up" : "Sign In"}
                </Button>
              </Field>
              <FieldDescription className="text-center">
                                {isSignup ? "Already have an account?" : "Don't have an account?"} {" "}
                <Link href={isSignup ? "/signin" : "/signup"}>
                  {isSignup ? "Sign In" : "Sign Up"}
                </Link>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="relative hidden bg-muted md:block" />
        </CardContent>
      </Card>
    </div>
  )
}
