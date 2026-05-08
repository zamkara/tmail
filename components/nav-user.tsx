"use client"

import * as React from "react"
import {
  BellIcon,
  ChevronsUpDownIcon,
  CheckCircle2Icon,
  ClockIcon,
  LogInIcon,
  LogOutIcon,
  MailIcon,
  UserIcon,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Field,
  FieldGroup,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import { getGravatarUrl } from "@/lib/gravatar"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner"
import { login, register, logout } from "@/services/auth.service"
import { useAddressStore } from "@/stores/address.store"
import { useAuthStore } from "@/stores/auth.store"

export function NavUser() {
  const { isMobile } = useSidebar()
  const authUser = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const setAddresses = useAddressStore((s) => s.setAddresses)
  const router = useRouter()
  const [preferenceOpen, setPreferenceOpen] = React.useState(false)
  const [notificationsOpen, setNotificationsOpen] = React.useState(false)
  const [authDialogOpen, setAuthDialogOpen] = React.useState(false)
  const [authMode, setAuthMode] = React.useState<"signin" | "signup">("signin")
  const [authLoading, setAuthLoading] = React.useState(false)

  const user = authUser
    ? {
        name: authUser.name,
        email: authUser.email,
        avatar: getGravatarUrl(authUser.email, 80),
      }
    : { name: "Guest", email: "Tanpa akun", avatar: "" }

  async function handleAuthSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const email = form.get("email") as string
    const password = form.get("password") as string

    setAuthLoading(true)
    try {
      if (authMode === "signup") {
        const name = form.get("name") as string
        const created = await register(name, email, password)
        setUser(created)
      } else {
        const loggedIn = await login(email, password)
        setUser(loggedIn)
      }
      setAuthDialogOpen(false)
      toast.success(
        authMode === "signup" ? "Akun berhasil dibuat" : "Berhasil masuk"
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleLogout() {
    await logout()
    setUser(null)
    setAddresses([])
    router.push("/inbox")
    toast.success("Berhasil keluar")
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground md:h-8 md:p-0"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {user.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
                <ChevronsUpDownIcon className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">
                      {user.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {authUser ? (
                <>
                  <DropdownMenuGroup>
                    <DropdownMenuItem onSelect={() => setPreferenceOpen(true)}>
                      <UserIcon />
                      Preference
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => setNotificationsOpen(true)}
                    >
                      <BellIcon />
                      Notifications
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void handleLogout()}>
                    <LogOutIcon />
                    Logout
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onSelect={() => {
                      setAuthMode("signin")
                      setAuthDialogOpen(true)
                    }}
                  >
                    <LogInIcon />
                    Masuk
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      setAuthMode("signup")
                      setAuthDialogOpen(true)
                    }}
                  >
                    <UserIcon />
                    Daftar
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        mode={authMode}
        onModeChange={setAuthMode}
        loading={authLoading}
        onSubmit={handleAuthSubmit}
        isMobile={isMobile}
      />
      <PreferenceSurface
        open={preferenceOpen}
        onOpenChange={setPreferenceOpen}
        isMobile={isMobile}
        user={user}
      />
      <NotificationsSurface
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
        isMobile={isMobile}
      />
    </>
  )
}

function AuthForm({
  mode,
  onModeChange,
  loading,
  onSubmit,
}: {
  mode: "signin" | "signup"
  onModeChange: (mode: "signin" | "signup") => void
  loading: boolean
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
}) {
  const isSignup = mode === "signup"

  return (
    <form onSubmit={onSubmit}>
      <div className="px-4 pb-4">
        <FieldGroup>
          {isSignup && (
            <Field>
              <FieldLabel htmlFor="auth-name">Nama</FieldLabel>
              <Input
                id="auth-name"
                name="name"
                type="text"
                placeholder="Nama lengkap"
                required
              />
            </Field>
          )}
          <Field>
            <FieldLabel htmlFor="auth-email">Email</FieldLabel>
            <Input
              id="auth-email"
              name="email"
              type="email"
              placeholder="m@example.com"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="auth-password">Password</FieldLabel>
            <Input
              id="auth-password"
              name="password"
              type="password"
              required
              minLength={8}
            />
          </Field>
        </FieldGroup>
      </div>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Spinner /> : isSignup ? "Daftar" : "Masuk"}
        </Button>
        <FieldDescription className="text-center">
          {isSignup ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
          <button
            type="button"
            className="underline underline-offset-4 hover:text-foreground"
            onClick={() => onModeChange(isSignup ? "signin" : "signup")}
          >
            {isSignup ? "Masuk" : "Daftar"}
          </button>
        </FieldDescription>
      </div>
    </form>
  )
}

function AuthDialog({
  open,
  onOpenChange,
  mode,
  onModeChange,
  loading,
  onSubmit,
  isMobile,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "signin" | "signup"
  onModeChange: (mode: "signin" | "signup") => void
  loading: boolean
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  isMobile: boolean
}) {
  const isSignup = mode === "signup"

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="px-4 pt-4">
            <DrawerTitle>
              {isSignup ? "Buat akun" : "Selamat datang"}
            </DrawerTitle>
            <DrawerDescription>
              {isSignup
                ? "Daftar dengan email dan password"
                : "Masuk dengan email dan password"}
            </DrawerDescription>
          </DrawerHeader>
          <AuthForm
            mode={mode}
            onModeChange={onModeChange}
            loading={loading}
            onSubmit={onSubmit}
          />
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 sm:max-w-md">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>{isSignup ? "Buat akun" : "Selamat datang"}</DialogTitle>
          <DialogDescription>
            {isSignup
              ? "Daftar dengan email dan password"
              : "Masuk dengan email dan password"}
          </DialogDescription>
        </DialogHeader>
        <AuthForm
          mode={mode}
          onModeChange={onModeChange}
          loading={loading}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  )
}

function PreferenceContent({
  user,
}: {
  user: { name: string; email: string; avatar: string }
}) {
  return (
    <form className="flex flex-col gap-4">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="account-email">Email</FieldLabel>
          <Input id="account-email" type="email" defaultValue={user.email} />
        </Field>
        <Field>
          <FieldLabel htmlFor="account-username">Username</FieldLabel>
          <Input id="account-username" defaultValue={user.name} />
        </Field>
        <Field>
          <FieldLabel htmlFor="account-password">Password baru</FieldLabel>
          <Input id="account-password" type="password" />
        </Field>
      </FieldGroup>
    </form>
  )
}

function PreferenceSurface({
  open,
  onOpenChange,
  isMobile,
  user,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  isMobile: boolean
  user: { name: string; email: string; avatar: string }
}) {
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
        <DrawerContent className="">
          <DrawerHeader className="px-4 pt-4">
            <DrawerTitle>Preference</DrawerTitle>
            <DrawerDescription>
              Update email, username, password, atau hapus akun.
            </DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-auto px-4">
            <PreferenceContent user={user} />
          </div>
          <DrawerFooter className="px-4 pb-4">
            <Button type="button">Save changes</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-fit p-0">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Preference</DialogTitle>
          <DialogDescription>
            Update email, username, password, atau hapus akun.
          </DialogDescription>
        </DialogHeader>
        <div className="px-4 pb-4">
          <PreferenceContent user={user} />
        </div>
        <DialogFooter className="mx-auto my-auto w-full">
          <Button type="button" variant="destructive">
            Delete account
          </Button>
          <Button type="button">Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function NotificationsSurface({
  open,
  onOpenChange,
  isMobile,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  isMobile: boolean
}) {
  const content = <NotificationsList />

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
        <DrawerContent className="h-[64svh]">
          <DrawerHeader className="px-4 pt-4">
            <DrawerTitle>Notifications</DrawerTitle>
            <DrawerDescription>Daftar notifikasi akun.</DrawerDescription>
          </DrawerHeader>
          <ScrollArea className="min-h-0 flex-1 px-4 pb-4">
            {content}
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 sm:max-w-lg">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Notifications</DialogTitle>
          <DialogDescription>Daftar notifikasi akun.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-105 px-4 pb-4">{content}</ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

const notifications = [
  {
    id: "notif_domain_ready",
    title: "Domain siap digunakan",
    description: "MX record tmail.io sudah aktif dan bisa menerima email.",
    time: "2 menit lalu",
    unread: true,
    icon: CheckCircle2Icon,
  },
  {
    id: "notif_new_mail",
    title: "Email baru diterima",
    description: "wx7k2m@tmail.io menerima pesan dari GitHub.",
    time: "30 menit lalu",
    unread: true,
    icon: MailIcon,
  },
  {
    id: "notif_dns_pending",
    title: "DNS masih propagasi",
    description:
      "Custom domain mycompany.com belum terdeteksi. Cek lagi beberapa menit lagi.",
    time: "1 jam lalu",
    unread: false,
    icon: ClockIcon,
  },
]

function NotificationsList() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Badge variant="secondary">2 unread</Badge>
        <Button type="button" variant="ghost" size="sm">
          Mark all read
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        {notifications.map((notification) => {
          const Icon = notification.icon

          return (
            <button
              key={notification.id}
              type="button"
              className="flex w-full items-start gap-3 rounded-lg border bg-background p-4 text-left hover:bg-muted"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Icon />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {notification.title}
                  </span>
                  {notification.unread && (
                    <span className="size-2 shrink-0 rounded-full bg-primary" />
                  )}
                </span>
                <span className="line-clamp-2 text-sm text-muted-foreground">
                  {notification.description}
                </span>
                <span className="text-xs text-muted-foreground">
                  {notification.time}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
