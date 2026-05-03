"use client"

import { FormEvent, useState } from "react"
import { PlusIcon } from "lucide-react"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { useIsMobile } from "@/hooks/use-mobile"
import { addDomain } from "@/services/domain.service"
import { useDomainStore } from "@/stores/domain.store"
import { cn } from "@/lib/utils"

const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/

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
  const addDomainToStore = useDomainStore((state) => state.addDomain)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedName = name.trim().toLowerCase()

    if (!domainPattern.test(normalizedName)) {
      setError("Format domain tidak valid")
      return
    }

    setError("")
    setIsLoading(true)

    try {
      const domain = await addDomain(normalizedName)
      addDomainToStore(domain)
      toast.success("Domain ditambahkan")
      setName("")
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
    <ScrollArea className="min-h-0 flex-1">
      <div className="flex flex-col gap-4 px-4 pb-4">
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
              }}
            />
            <FieldError>{error}</FieldError>
          </Field>
        </FieldGroup>

        <section className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
          <div className="flex flex-col gap-1">
            <h3 className="font-medium">Method 1</h3>
            <p className="text-muted-foreground">
              Daftarkan domain sendiri, lalu arahkan MX record ke mail server.
            </p>
          </div>
          <ol className="ml-4 flex list-decimal flex-col gap-2">
            <li>
              Cari registrar domain dari daftar ICANN-Accredited Registrars.
            </li>
            <li>Daftarkan domain yang kamu inginkan.</li>
            <li>Tambahkan MX record berikut pada DNS domain.</li>
          </ol>
          <div className="flex flex-col gap-1 rounded-lg border bg-background p-3 font-mono text-xs">
            <p>Name/Host/Alias: kosong, @, atau nama domain</p>
            <p>Record Type: MX</p>
            <p>TTL: 86400</p>
            <p>Priority: 1</p>
            <p>Mail server: generator.email.</p>
          </div>
          <ol className="ml-4 flex list-decimal flex-col gap-2" start={4}>
            <li>Tunggu perubahan DNS aktif, biasanya 1 menit sampai 1 hari.</li>
            <li>Gunakan format https://generator.email/your-domain.com</li>
          </ol>
        </section>

        <section className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
          <div className="flex flex-col gap-1">
            <h3 className="font-medium">Method 2</h3>
            <p className="text-muted-foreground">
              Hubungi support jika ingin dibantu proses setup DNS.
            </p>
          </div>
          <ol className="ml-4 flex list-decimal flex-col gap-2">
            <li>Daftarkan domain yang kamu inginkan.</li>
            <li>Kirim Feedback dengan subject “New Domain”.</li>
            <li>
              Sertakan site registrar, username atau email akun, dan domain
              name.
            </li>
            <li>
              Jangan kirim password registrar. Gunakan akses delegasi DNS atau
              instruksi manual dari support.
            </li>
          </ol>
        </section>
      </div>
    </ScrollArea>
  )

  const submitButton = (
    <Button type="submit" disabled={isLoading}>
      {isLoading && <Spinner data-icon="inline-start" />}
      Simpan Domain
    </Button>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen} direction="bottom">
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="h-[82svh] w-full">
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => void handleSubmit(event)}
          >
            <DrawerHeader>
              <DrawerTitle>New Email Generator domain name</DrawerTitle>
              <DrawerDescription>
                Tambahkan domain dan arahkan MX record ke server email
                generator.
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
      <DialogContent className="p-0 sm:max-w-2xl">
        <form
          className="flex max-h-[82svh] min-h-0 flex-col"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <DialogHeader className="p-4 pb-3">
            <DialogTitle>New Email Generator domain name</DialogTitle>
            <DialogDescription>
              Masukkan domain yang akan dipakai untuk disposable email, lalu
              arahkan MX record domain ke server email generator.
            </DialogDescription>
          </DialogHeader>
          <Separator />
          {body}
          <DialogFooter className="border-t p-4">{submitButton}</DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
