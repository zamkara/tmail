import "./globals.css"
import AdminSessionDialog from "@/components/admin/admin-session-dialog"
import BackendInboxSync from "@/components/backend-inbox-sync"
import { AuthLoader } from "@/components/auth-loader"
import { InboxStateSync } from "@/components/inbox-state-sync"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="font-sans antialiased"
    >
      <body>
        <ThemeProvider>
          <AuthLoader />
          <InboxStateSync />
          <BackendInboxSync />
          <TooltipProvider>
            <div className="h-svh overflow-y-auto">
              {children}
              <footer className="px-4 py-3 text-center text-xs text-muted-foreground">
                &copy; 2026 Premiumisme. All rights reserved.
              </footer>
            </div>
            <AdminSessionDialog />
          </TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
