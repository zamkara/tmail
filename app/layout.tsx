import { Geist, Geist_Mono } from "next/font/google"

import "./globals.css"
import AdminSessionDialog from "@/components/admin/admin-session-dialog"
import BackendInboxSync from "@/components/backend-inbox-sync"
import { AuthLoader } from "@/components/auth-loader"
import { InboxStateSync } from "@/components/inbox-state-sync"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        fontSans.variable
      )}
    >
      <body>
        <ThemeProvider>
          <AuthLoader />
          <InboxStateSync />
          <BackendInboxSync />
          <TooltipProvider>
            {children}
            <AdminSessionDialog />
          </TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
