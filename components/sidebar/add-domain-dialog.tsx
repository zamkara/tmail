"use client"

import { type FormEvent, useState } from "react"
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
}

export default function AddDomainDialog({
  iconOnly = false,
  className,
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
      setError("Format domain tidak valid")
      return
    }

    setError("")
    setIsLoading(true)

    try {
      if (!isVerified) {
        await verifyDomain(normalizedName)
        setVerifiedName(normalizedName)
        toast.success("Domain terverifikasi")
        return
      }

      const domain = await addDomain(normalizedName)
      addDomainToStore(domain)
      toast.success("Domain ditambahkan")
      setName("")
      setVerifiedName(null)
      setOpen(false)
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Gagal menambahkan domain"
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const trigger = (
    <Button
      type="button"
      variant="outline"
      size={iconOnly ? "icon-sm" : "sm"}
      className={cn(!iconOnly && "w-full", className)}
      aria-label="Tambah domain"
    >
      <PlusIcon data-icon={iconOnly ? undefined : "inline-start"} />
      {!iconOnly && "Tambah Domain"}
    </Button>
  )

  const body = (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="flex flex-col gap-4 p-4">
        <FieldGroup className="pt-1">
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor="domain-name">Domain name</FieldLabel>
            <Input
              id="domain-name"
              value={name}
              placeholder="your-domain.com"
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
                MX domain sudah cocok.
              </p>
            )}
          </Field>
        </FieldGroup>

        <section className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
          <div className="flex flex-col gap-1">
            <h3 className="font-medium">DNS yang harus dibuat</h3>
            <p className="text-muted-foreground">
              Buat MX untuk domain yang kamu masukkan. A/AAAA/CNAME website
              tidak perlu dihapus.
            </p>
          </div>
          <div className="overflow-hidden rounded-lg border bg-background text-xs">
            <DnsRow label="Type" value="MX" />
            <DnsRow label="Host" value="@ atau subdomain" />
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
    <Button type="submit" disabled={isLoading}>
      {isLoading && <Spinner data-icon="inline-start" />}
      {isVerified ? "Simpan Domain" : "Verifikasi Domain"}
    </Button>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen} direction="bottom">
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="h-[82svh] w-full overflow-hidden">
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => void handleSubmit(event)}
          >
            <DrawerHeader>
              <DrawerTitle>Tambah domain custom</DrawerTitle>
              <DrawerDescription>
                Masukkan domain yang DNS MX-nya mengarah ke{" "}
                <code className="rounded bg-muted px-1 text-xs">
                  {MAIL_SERVER_HOST || "mx.thvuinin.my.id"}
                </code>
                .
              </DrawerDescription>
            </DrawerHeader>
            <Separator />
            {body}
            <DrawerFooter className="border-t">{submitButton}</DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[min(720px,calc(100svh-2rem))] overflow-hidden p-0 sm:max-w-xl">
        <form
          className="flex max-h-[min(720px,calc(100svh-2rem))] min-h-0 flex-col"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <DialogHeader className="p-4 pb-3">
            <DialogTitle>Tambah domain custom</DialogTitle>
            <DialogDescription>
              Masukkan domain yang DNS MX-nya mengarah ke{" "}
              <code className="rounded bg-muted px-1 text-xs">
                {MAIL_SERVER_HOST || "mx.thvuinin.my.id"}
              </code>
              .
            </DialogDescription>
          </DialogHeader>
          <Separator />
          {body}
          <DialogFooter className="mx-0 mb-0 rounded-none border-t p-4">
            {submitButton}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DnsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[88px_minmax(0,1fr)] border-b last:border-b-0">
      <div className="bg-muted/50 px-3 py-2 text-muted-foreground">{label}</div>
      <code className="min-w-0 px-3 py-2 font-mono text-xs break-all">
        {value}
      </code>
    </div>
  )
}
