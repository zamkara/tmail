"use client"

import * as React from "react"
import Image from "next/image"
import {
  BellIcon,
  ChevronsUpDownIcon,
  CheckCircle2Icon,
  ClockIcon,
  CreditCardIcon,
  GiftIcon,
  KeyRoundIcon,
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
import CopyButton from "@/components/shared/copy-button"
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
import { getProfileAvatarSrc, PROFILE_AVATAR_PRESETS } from "@/lib/profile-avatar"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner"
import {
  generateApiKey,
  getApiKey,
  login,
  logout,
  register,
  updateProfile,
  updateApiKeyAccess,
} from "@/services/auth.service"
import { redeemDomainVoucher } from "@/services/domain.service"
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
  const [billingOpen, setBillingOpen] = React.useState(false)
  const [apiKeyOpen, setApiKeyOpen] = React.useState(false)
  const [authDialogOpen, setAuthDialogOpen] = React.useState(false)
  const [authMode, setAuthMode] = React.useState<"signin" | "signup">("signin")
  const [authLoading, setAuthLoading] = React.useState(false)

  const user = authUser
    ? {
        name: authUser.name,
        email: authUser.email,
        avatar:
          getProfileAvatarSrc(authUser.avatarPreset) ??
          getGravatarUrl(authUser.email, 80),
      }
    : { name: "Guest", email: "No account", avatar: "" }

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
        authMode === "signup" ? "Account created successfully" : "Signed in successfully"
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleLogout() {
    await logout()
    setUser(null)
    setAddresses([])
    router.push("/inbox")
    toast.success("Signed out successfully")
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
                    <DropdownMenuItem
                      onSelect={() => setBillingOpen(true)}
                    >
                      <CreditCardIcon />
                      Billing
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setApiKeyOpen(true)}>
                      <KeyRoundIcon />
                      Apikey
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
                    Sign In
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      setAuthMode("signup")
                      setAuthDialogOpen(true)
                    }}
                  >
                    <UserIcon />
                    Sign Up
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
      <BillingSurface
        open={billingOpen}
        onOpenChange={setBillingOpen}
        isMobile={isMobile}
      />
      <ApiKeySurface
        open={apiKeyOpen}
        onOpenChange={setApiKeyOpen}
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
              <FieldLabel htmlFor="auth-name">Name</FieldLabel>
              <Input
                id="auth-name"
                name="name"
                type="text"
                placeholder="Full name"
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
              placeholder="user@gmail.com"
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
          {loading ? <Spinner /> : isSignup ? "Sign Up" : "Sign In"}
        </Button>
        <FieldDescription className="text-center">
                    {isSignup ? "Already have an account?" : "Don't have an account?"} {" "}
          <button
            type="button"
            className="underline underline-offset-4 hover:text-foreground"
            onClick={() => onModeChange(isSignup ? "signin" : "signup")}
          >
            {isSignup ? "Sign In" : "Sign Up"}
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
              {isSignup ? "Create account" : "Welcome back"}
            </DrawerTitle>
            <DrawerDescription>
              {isSignup
                ? "Sign up with email and password"
                : "Sign in with email and password"}
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
          <DialogTitle>{isSignup ? "Create account" : "Welcome back"}</DialogTitle>
          <DialogDescription>
            {isSignup
              ? "Sign up with email and password"
              : "Sign in with email and password"}
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
  saveKey,
  selectedAvatarPreset,
  onAvatarPresetChange,
}: {
  user: { name: string; email: string; avatar: string }
  saveKey: string
  selectedAvatarPreset: string | null
  onAvatarPresetChange: (value: string) => void
}) {
  return (
    <form id={saveKey} className="flex flex-col gap-4">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="account-email">Email</FieldLabel>
          <Input
            id="account-email"
            name="email"
            type="email"
            defaultValue={user.email}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="account-username">Username</FieldLabel>
          <Input id="account-username" name="name" defaultValue={user.name} />
        </Field>
        <Field>
          <FieldLabel htmlFor="account-password">Password baru</FieldLabel>
          <Input id="account-password" name="password" type="password" />
        </Field>
        <Field>
          <FieldLabel>Foto Profil</FieldLabel>
          <div className="grid grid-cols-2 gap-3">
            {PROFILE_AVATAR_PRESETS.map((preset) => {
              const isActive = selectedAvatarPreset === preset.id

              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`rounded-xl border p-2 text-left transition ${
                    isActive
                      ? "border-primary bg-primary/8"
                      : "border-border hover:bg-muted/50"
                  }`}
                  onClick={() => onAvatarPresetChange(preset.id)}
                >
                  <div className="mb-2 flex items-center gap-3">
                    <div className="relative size-14 overflow-hidden rounded-full border">
                      <Image
                        src={preset.src}
                        alt={preset.label}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium">{preset.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {isActive ? "Dipilih" : "Pilih avatar ini"}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
          <FieldDescription>
            Foto profil hanya bisa dipilih dari daftar preset.
          </FieldDescription>
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
  const authUser = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const [selectedAvatarPreset, setSelectedAvatarPreset] = React.useState<string | null>(
    authUser?.avatarPreset ?? PROFILE_AVATAR_PRESETS[0]?.id ?? null
  )
  const [isSavingProfile, setIsSavingProfile] = React.useState(false)
  const formId = React.useId()

  React.useEffect(() => {
    if (!open) return
    setSelectedAvatarPreset(authUser?.avatarPreset ?? PROFILE_AVATAR_PRESETS[0]?.id ?? null)
  }, [authUser?.avatarPreset, open])

  async function handleSaveProfile() {
    const form = document.getElementById(formId) as HTMLFormElement | null
    if (!form) return

    const formData = new FormData(form)
    const name = String(formData.get("name") ?? user.name)
    const email = String(formData.get("email") ?? user.email)
    const password = String(formData.get("password") ?? "").trim()

    setIsSavingProfile(true)
    try {
      const result = await updateProfile({
        name,
        email,
        password: password || undefined,
        avatarPreset: selectedAvatarPreset,
      })
      setUser(result.user)
      toast.success("Profile updated")
      onOpenChange(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update profile"
      )
    } finally {
      setIsSavingProfile(false)
    }
  }

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
        <DrawerContent className="">
          <DrawerHeader className="px-4 pt-4">
            <DrawerTitle>Preference</DrawerTitle>
            <DrawerDescription>
              Update email, username, password, or delete account.
            </DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-auto px-4">
            <PreferenceContent
              user={user}
              saveKey={formId}
              selectedAvatarPreset={selectedAvatarPreset}
              onAvatarPresetChange={setSelectedAvatarPreset}
            />
          </div>
          <DrawerFooter className="px-4 pb-4">
            <Button
              type="button"
              disabled={isSavingProfile}
              onClick={() => void handleSaveProfile()}
            >
              {isSavingProfile ? <Spinner /> : null}
              Save changes
            </Button>
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
            Update email, username, password, or delete account.
          </DialogDescription>
        </DialogHeader>
        <div className="px-4 pb-4">
          <PreferenceContent
            user={user}
            saveKey={formId}
            selectedAvatarPreset={selectedAvatarPreset}
            onAvatarPresetChange={setSelectedAvatarPreset}
          />
        </div>
        <DialogFooter className="mx-auto my-auto w-full">
          <Button
            type="button"
            variant="default"
            className="bg-[#fb2c36] text-white hover:bg-[#fb2c36]/90"
          >
            Delete account
          </Button>
          <Button
            type="button"
            disabled={isSavingProfile}
            onClick={() => void handleSaveProfile()}
          >
            {isSavingProfile ? <Spinner /> : null}
            Save changes
          </Button>
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
            <DrawerDescription>Account notifications list.</DrawerDescription>
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
          <DialogDescription>Account notifications list.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-105 px-4 pb-4">{content}</ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

interface BillingStatus {
  subscription: {
    isPremium: boolean
    premiumUntil: string | null
    privateDomainUsage: number
    privateDomainLimit: number
    privateDomainRemaining: number
  }
}

function formatDateTime(value: string | null) {
  if (!value) return "Not active"

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function BillingContent() {
  const authUser = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const [status, setStatus] = React.useState<BillingStatus | null>(null)
  const [code, setCode] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [isRedeeming, setIsRedeeming] = React.useState(false)
  const [isCancelling, setIsCancelling] = React.useState(false)
  const [cancelConfirmOpen, setCancelConfirmOpen] = React.useState(false)

  const loadBilling = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/billing", { cache: "no-store" })
      const data = (await res.json()) as BillingStatus & {
        user?: typeof authUser
        error?: string
      }
      if (!res.ok) throw new Error(data.error ?? "Failed to load billing")
      setStatus(data)
      if (data.user) setUser(data.user)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load billing"
      )
    } finally {
      setIsLoading(false)
    }
  }, [setUser])

  React.useEffect(() => {
    void loadBilling()
  }, [loadBilling])

  async function handleRedeem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedCode = code.trim().toUpperCase()
    if (!normalizedCode) {
      toast.error("Enter a voucher code")
      return
    }

    setIsRedeeming(true)
    try {
      const redeemed = await redeemDomainVoucher(normalizedCode)
      setUser(redeemed.user)
      setCode("")
      toast.success("Voucher redeemed")
      await loadBilling()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to redeem voucher"
      )
    } finally {
      setIsRedeeming(false)
    }
  }

  async function handleCancelSubscription() {
    setIsCancelling(true)
    try {
      const res = await fetch("/api/billing", { method: "DELETE" })
      const data = (await res.json()) as BillingStatus & {
        user?: typeof authUser
        error?: string
      }
      if (!res.ok) throw new Error(data.error ?? "Failed to cancel subscription")
      setStatus(data)
      if (data.user) setUser(data.user)
      setCancelConfirmOpen(false)
      toast.success("Subscription cancelled")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to cancel subscription"
      )
    } finally {
      setIsCancelling(false)
    }
  }

  const subscription = status?.subscription

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="min-w-0 rounded-lg border p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Subscription</p>
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? "Loading..."
                : subscription?.isPremium
                  ? `Active until ${formatDateTime(subscription.premiumUntil)}`
                  : "No active subscription"}
            </p>
          </div>
          <Badge variant={subscription?.isPremium ? "default" : "outline"}>
            {subscription?.isPremium ? "Premium" : "Free"}
          </Badge>
        </div>
        <Separator className="my-3" />
        <p className="text-sm text-muted-foreground">
          Private domains used: {subscription?.privateDomainUsage ?? 0}/
          {subscription?.privateDomainLimit ?? 0}
        </p>
      </div>

      {subscription?.isPremium ? (
        <>
          <Button
            type="button"
            variant="destructive"
            disabled={isCancelling}
            onClick={() => setCancelConfirmOpen(true)}
          >
            Cancel Subscription
          </Button>
          <Dialog
            open={cancelConfirmOpen}
            onOpenChange={setCancelConfirmOpen}
          >
            <DialogContent className="p-0 sm:max-w-sm">
              <DialogHeader className="px-4 pt-4">
                <DialogTitle>Cancel Subscription?</DialogTitle>
                <DialogDescription>
                  Your premium access will end and private domains will become
                  public again.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 px-4 pb-4 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isCancelling}
                  onClick={() => setCancelConfirmOpen(false)}
                >
                  Keep Subscription
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isCancelling}
                  onClick={() => void handleCancelSubscription()}
                >
                  {isCancelling ? <Spinner /> : null}
                  Cancel Subscription
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <form onSubmit={handleRedeem} className="flex flex-col gap-3">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="billing-voucher-code">
                Redeem Voucher
              </FieldLabel>
              <Input
                id="billing-voucher-code"
                value={code}
                disabled={isRedeeming}
                placeholder="Enter voucher code"
                onChange={(event) => setCode(event.target.value.toUpperCase())}
              />
              <FieldDescription>
                Redeeming a voucher activates premium and private domain quota.
              </FieldDescription>
            </Field>
          </FieldGroup>
          <Button type="submit" disabled={isRedeeming}>
            {isRedeeming ? <Spinner /> : <GiftIcon data-icon="inline-start" />}
            Redeem Voucher
          </Button>
        </form>
      )}
    </div>
  )
}

function BillingSurface({
  open,
  onOpenChange,
  isMobile,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  isMobile: boolean
}) {
  const content = <BillingContent />

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
        <DrawerContent>
          <DrawerHeader className="px-4 pt-4">
            <DrawerTitle>Billing</DrawerTitle>
            <DrawerDescription>
              Manage subscription and redeem vouchers.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4">{content}</div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 sm:max-w-md">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Billing</DialogTitle>
          <DialogDescription>
            Manage subscription and redeem vouchers.
          </DialogDescription>
        </DialogHeader>
        <div className="px-4 pb-4">{content}</div>
      </DialogContent>
    </Dialog>
  )
}

function parseIpLines(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function ApiKeyContent({ open }: { open: boolean }) {
  const authUser = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const [generatedKey, setGeneratedKey] = React.useState("")
  const [allowAllIps, setAllowAllIps] = React.useState(
    authUser?.apiKeyAllowAllIps ?? true
  )
  const [allowedIps, setAllowedIps] = React.useState(
    authUser?.apiKeyAllowedIps?.join("\n") ?? ""
  )
  const [blockedIps, setBlockedIps] = React.useState(
    authUser?.apiKeyBlockedIps?.join("\n") ?? ""
  )
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [isLoadingKey, setIsLoadingKey] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const isPremium = Boolean(authUser?.isPremium && authUser.premiumUntil)

  React.useEffect(() => {
    if (!open || !isPremium) return

    let cancelled = false

    async function loadApiKey() {
      setIsLoadingKey(true)
      try {
        const data = await getApiKey()
        if (cancelled) return
        setGeneratedKey(data.apiKey ?? "")
        setUser(data.user)
        setAllowAllIps(data.user.apiKeyAllowAllIps)
        setAllowedIps(data.user.apiKeyAllowedIps.join("\n"))
        setBlockedIps(data.user.apiKeyBlockedIps.join("\n"))
      } catch {
        if (!cancelled) setGeneratedKey("")
      } finally {
        if (!cancelled) setIsLoadingKey(false)
      }
    }

    void loadApiKey()

    return () => {
      cancelled = true
    }
  }, [isPremium, open, setUser])

  async function handleGenerate() {
    setIsGenerating(true)
    try {
      const data = await generateApiKey()
      setGeneratedKey(data.apiKey)
      setUser(data.user)
      toast.success("API key generated")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate API key"
      )
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleSaveAccess() {
    setIsSaving(true)
    try {
      const data = await updateApiKeyAccess({
        allowAllIps,
        allowedIps: parseIpLines(allowedIps),
        blockedIps: parseIpLines(blockedIps),
      })
      setUser(data.user)
      toast.success("API key access updated")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update API key"
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {!isPremium ? (
        <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
          Premium subscription is required to generate and use API keys.
        </p>
      ) : null}
      <div className="min-w-0 rounded-lg border p-4">
        <p className="text-sm font-medium">Current API key</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {authUser?.apiKeyPrefix
            ? `Prefix: ${authUser.apiKeyPrefix}...`
            : "No API key generated yet."}
        </p>
        {isLoadingKey ? (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            Loading API key...
          </div>
        ) : generatedKey ? (
          <div className="mt-3 grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-lg border bg-muted/30 p-2">
            <code className="block min-w-0 max-w-full overflow-hidden break-all rounded-md bg-background/40 px-2 py-1.5 font-mono text-xs leading-relaxed whitespace-pre-wrap">
              {generatedKey}
            </code>
            <CopyButton
              text={generatedKey}
              className="size-8 shrink-0"
              label="Copy API key"
              successMessage="API key copied"
              errorMessage="Failed to copy API key"
            />
          </div>
        ) : authUser?.apiKeyPrefix ? (
          <p className="mt-3 text-sm text-muted-foreground">
            This API key cannot be shown in full. Generate a new API key to view
            and copy it here.
          </p>
        ) : null}
        <Button
          type="button"
          className="mt-3"
          disabled={!isPremium || isGenerating}
          onClick={() => void handleGenerate()}
        >
          {isGenerating ? <Spinner /> : <KeyRoundIcon data-icon="inline-start" />}
          Generate API Key
        </Button>
      </div>
      <FieldGroup>
        <Field>
          <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <span>Use API key from all IPs</span>
            <input
              type="checkbox"
              checked={allowAllIps}
              disabled={!isPremium || isSaving}
              onChange={(event) => setAllowAllIps(event.target.checked)}
            />
          </label>
        </Field>
        <Field>
          <FieldLabel htmlFor="api-allowed-ips">Whitelist IP</FieldLabel>
          <Textarea
            id="api-allowed-ips"
            value={allowedIps}
            disabled={!isPremium || allowAllIps || isSaving}
            placeholder={"1.1.1.1\n8.8.8.8"}
            onChange={(event) => setAllowedIps(event.target.value)}
          />
          <FieldDescription>
            One IP per line. Disabled while all IPs are allowed.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="api-blocked-ips">Blacklist IP</FieldLabel>
          <Textarea
            id="api-blocked-ips"
            value={blockedIps}
            disabled={!isPremium || isSaving}
            placeholder={"192.0.2.1\n203.0.113.10"}
            onChange={(event) => setBlockedIps(event.target.value)}
          />
          <FieldDescription>One IP per line.</FieldDescription>
        </Field>
      </FieldGroup>
      <Button
        type="button"
        variant="outline"
        disabled={!isPremium || isSaving}
        onClick={() => void handleSaveAccess()}
      >
        {isSaving ? <Spinner /> : null}
        Save API Key Access
      </Button>
    </div>
  )
}

function ApiKeySurface({
  open,
  onOpenChange,
  isMobile,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  isMobile: boolean
}) {
  const content = <ApiKeyContent open={open} />

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
        <DrawerContent>
          <DrawerHeader className="px-4 pt-4">
            <DrawerTitle>Apikey</DrawerTitle>
            <DrawerDescription>
              Generate API keys and configure IP access.
            </DrawerDescription>
          </DrawerHeader>
          <div className="min-w-0 px-4 pb-4">{content}</div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Apikey</DialogTitle>
          <DialogDescription>
            Generate API keys and configure IP access.
          </DialogDescription>
        </DialogHeader>
        <div className="min-w-0 px-4 pb-4">{content}</div>
      </DialogContent>
    </Dialog>
  )
}

const notifications = [
  {
    id: "notif_domain_ready",
    title: "Domain ready",
    description: "MX record for tmail.io is active and can receive emails.",
    time: "2 min ago",
    unread: true,
    icon: CheckCircle2Icon,
  },
  {
    id: "notif_new_mail",
    title: "New email received",
    description: "wx7k2m@tmail.io received a message from GitHub.",
    time: "30 min ago",
    unread: true,
    icon: MailIcon,
  },
  {
    id: "notif_dns_pending",
    title: "DNS still propagating",
    description:
      "Custom domain mycompany.com has not been detected yet. Check again in a few minutes.",
    time: "1 hour ago",
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
