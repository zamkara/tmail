import { cn } from "@/lib/utils"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function LoginForm({
  className,
  mode = "signin",
  ...props
}: React.ComponentProps<"div"> & {
  mode?: "signin" | "signup"
}) {
  const isSignup = mode === "signup"

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8">
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">
                  {isSignup ? "Create an account" : "Welcome back"}
                </h1>
                <p className="text-balance text-muted-foreground">
                  {isSignup
                    ? "Sign up with your email, username and password"
                    : "Login with your email or username and password"}
                </p>
              </div>
              {isSignup ? (
                <>
                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="username">Username</FieldLabel>
                    <Input
                      id="username"
                      type="text"
                      placeholder="username"
                      autoComplete="username"
                      required
                    />
                  </Field>
                </>
              ) : (
                <Field>
                  <FieldLabel htmlFor="identifier">Email or username</FieldLabel>
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="m@example.com or username"
                    autoComplete="username"
                    required
                  />
                </Field>
              )}
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <a
                    href="#"
                    className="ml-auto text-sm underline-offset-2 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>
                <Input id="password" type="password" required />
              </Field>
              <Field>
                <Button type="submit">{isSignup ? "Sign up" : "Login"}</Button>
              </Field>
              <FieldDescription className="text-center">
                {isSignup
                  ? "Already have an account?"
                  : "Don’t have an account?"}{" "}
                <Link href={isSignup ? "/signin" : "/signup"}>
                  {isSignup ? "Login" : "Sign up"}
                </Link>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="relative hidden bg-muted md:block">
            <img
              src="/placeholder.svg"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
