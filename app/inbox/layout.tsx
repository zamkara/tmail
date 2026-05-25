import { AppSidebar } from "@/components/app-sidebar"
import {
  AddressSidebar,
  AddressSidebarProvider,
  AddressSidebarTrigger,
} from "@/components/address-sidebar"
import {
  MobileAddressDrawerTrigger,
  MobileInboxDrawerTrigger,
} from "@/components/mobile-sidebar-drawers"
import InboxBreadcrumb from "@/components/inbox/inbox-breadcrumb"
import ModeToggle from "@/components/shared/mode-toggle"
import SyncActiveAddress from "@/components/sync-active-address"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { getAuthUser } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function InboxLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const auth = await getAuthUser()
  if (!auth) {
    redirect("/signin")
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "350px",
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <AddressSidebarProvider>
        <SidebarInset>
          <SyncActiveAddress />
          <header className="fixed inset-x-0 bottom-0 z-40 flex shrink-0 items-center gap-2 border-t bg-background p-4 md:sticky md:top-0 md:bottom-auto md:border-t-0 md:border-b">
            <MobileInboxDrawerTrigger />
            <SidebarTrigger className="-ml-1 hidden md:inline-flex" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <InboxBreadcrumb />
            <div className="ml-auto flex items-center gap-1">
              <ModeToggle />
              <MobileAddressDrawerTrigger />
              <AddressSidebarTrigger className="hidden md:inline-flex" />
            </div>
          </header>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-20 md:pb-0">{children}</div>
        </SidebarInset>
        <AddressSidebar />
      </AddressSidebarProvider>
    </SidebarProvider>
  )
}
