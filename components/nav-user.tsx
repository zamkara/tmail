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
import Link from "next/link"
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { logout } from "@/services/auth.service"
import { useAuthStore } from "@/stores/auth.store"

export function NavUser() {
  const { isMobile } = useSidebar()
  const authUser = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const router = useRouter()
  const [preferenceOpen, setPreferenceOpen] = React.useState(false)
  const [notificationsOpen, setNotificationsOpen] = React.useState(false)

  const user = authUser
    ? { name: authUser.name, email: authUser.email, avatar: "" }
    : { name: "Guest", email: "Tanpa akun", avatar: "" }

  async function handleLogout() {
    await logout()
    setUser(null)
    router.push("/signin")
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
                    <DropdownMenuItem onSelect={() => setNotificationsOpen(true)}>
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
                  <DropdownMenuItem asChild>
                    <Link href="/signin">
                      <LogInIcon />
                      Masuk / Daftar
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
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

function PreferenceContent({ user }: { user: { name: string; email: string; avatar: string } }) {
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
      <Separator />
      <Button type="button" variant="destructive">
        Delete account
      </Button>
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
        <DrawerContent className="h-[74svh]">
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
      <DialogContent className="p-0 sm:max-w-lg">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Preference</DialogTitle>
          <DialogDescription>
            Update email, username, password, atau hapus akun.
          </DialogDescription>
        </DialogHeader>
        <div className="px-4 pb-4">
          <PreferenceContent user={user} />
        </div>
        <DialogFooter className="px-4 pb-4">
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
        <ScrollArea className="max-h-[420px] px-4 pb-4">{content}</ScrollArea>
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
