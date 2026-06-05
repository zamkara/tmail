"use client"

import Link from "next/link"
import { type FormEvent, type ReactNode, useState } from "react"
import { CheckIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { useIsMobile } from "@/hooks/use-mobile"
import { addDomain, verifyDomain } from "@/services/domain.service"
import { useDomainStore } from "@/stores/domain.store"
import { isValidDomain } from "@/lib/domain-validation"
import { cn } from "@/lib/utils"

const MAIL_SERVER_HOST = process.env.NEXT_PUBLIC_MAIL_SERVER_HOST ?? ""

interface AddDomainDialogProps {
  iconOnly?: boolean
  className?: string
  trigger?: ReactNode
  showSignInLink?: boolean
  signInHref?: string
  signInLabel?: string
}

export default function AddDomainDialog({
  iconOnly = false,
  className,
  trigger,
  showSignInLink = false,
  signInHref = "/signin",
  signInLabel = "Sign In",
}: AddDomainDialogProps) {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [verifiedName, setVerifiedName] = useState<string | null>(null)
  const addDomainToStore = useDomainStore((state) => state.addDomain)
  const normalizedName = name.trim().toLowerCase()
  const isVerified = verifiedName === normalizedName

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!isValidDomain(normalizedName)) {
      setError("Enter a valid domain — e.g. yourcompany.com")
      return
    }

    setError("")
    setIsLoading(true)

    try {
      if (!isVerified) {
        await verifyDomain(normalizedName)
        setVerifiedName(normalizedName)
        toast.success("MX record confirmed")
        return
      }

      const domain = await addDomain(normalizedName)
      addDomainToStore(domain)
      toast.success("Domain added successfully")
      setName("")
      setVerifiedName(null)
      setOpen(false)
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong. Try again."
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const defaultTrigger = (
    <Button
      type="button"
      variant="outline"
      size={iconOnly ? "icon-sm" : "sm"}
      className={cn(!iconOnly && "w-full", className)}
      aria-label="Add domain"
    >
      <PlusIcon data-icon={iconOnly ? undefined : "inline-start"} />
      {!iconOnly && "Add Domain"}
    </Button>
  )

  const authLink = showSignInLink ? (
    <div className="border-t px-4 pb-4 pt-3 text-center text-sm text-muted-foreground">
      Already have an account?{" "}
      <Button asChild variant="link" className="h-auto p-0 align-baseline">
        <Link href={signInHref}>{signInLabel}</Link>
      </Button>
    </div>
  ) : null

  const body = (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="flex flex-col gap-4 p-4">
        <FieldGroup className="pt-1">
          <Field data-invalid={Boolean(error)}>
            <Input
              id="domain-name"
              value={name}
              placeholder="yourcompany.com"
              aria-invalid={Boolean(error)}
              disabled={isLoading}
              onChange={(event) => {
                setName(event.target.value)
                setError("")
                setVerifiedName(null)
              }}
            />
            <FieldError>{error}</FieldError>
            {isVerified && (
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <CheckIcon className="size-4 text-primary" />
                MX record looks good.
              </p>
            )}
          </Field>
        </FieldGroup>

        <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 text-sm shadow-sm">
          <div className="flex flex-col gap-1">
            <h3 className="font-medium">DNS configuration required</h3>
            <p className="text-muted-foreground">
              Add an MX record pointing to the address below.
            </p>
          </div>
          <div className="overflow-hidden rounded-lg border border-border bg-input text-xs">
            <DnsRow label="Type" value="MX" />
            <DnsRow label="Host" value="@ or subdomain" />
            <DnsRow
              label="Value"
              value={MAIL_SERVER_HOST || "mx.thvuinin.my.id"}
            />
            <DnsRow label="Priority" value="10" />
            <DnsRow label="TTL" value="Auto / 3600" />
          </div>
        </section>
      </div>
    </div>
  )

  const submitButton = (
    <Button type="submit" className="w-full" disabled={isLoading}>
      {isLoading && <Spinner data-icon="inline-start" />}
      {isVerified ? "Save Domain" : "Verify Domain"}
    </Button>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen} direction="bottom">
        <DrawerTrigger asChild>{trigger ?? defaultTrigger}</DrawerTrigger>
        <DrawerContent className="w-full overflow-hidden border-border bg-card text-card-foreground">
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => void handleSubmit(event)}
          >
            <DrawerHeader>
              <DrawerTitle>Add a custom domain</DrawerTitle>
              <DrawerDescription className="sr-only">
                Add and verify a custom email domain.
              </DrawerDescription>
            </DrawerHeader>
            <Separator />
            {body}
            <DrawerFooter className="border-t">{submitButton}</DrawerFooter>
            {authLink}
          </form>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent className="overflow-hidden border-border bg-card p-0 text-card-foreground">
        <form
          className="flex min-h-0 flex-col"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <DialogHeader className="p-4">
            <DialogTitle>Add a custom domain</DialogTitle>
            <DialogDescription className="sr-only">
              Add and verify a custom email domain.
            </DialogDescription>
          </DialogHeader>
          <Separator />
          {body}
          <DialogFooter className="mx-0 mb-0 rounded-none border-t p-4">
            {submitButton}
          </DialogFooter>
          {authLink}
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DnsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[88px_minmax(0,1fr)] border-b border-border last:border-b-0">
      <div className="bg-secondary px-3 py-2 text-secondary-foreground">
        {label}
      </div>
      <code className="min-w-0 px-3 py-2 font-mono text-xs break-all text-foreground">
        {value}
      </code>
    </div>
  )
}
