import { Geist_Mono, Inter } from "next/font/google"

import "./globals.css"
import AdminSessionDialog from "@/components/admin/admin-session-dialog"
import { AuthLoader } from "@/components/auth-loader"
import { InboxStateSync } from "@/components/inbox-state-sync"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

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
        inter.variable
      )}
    >
      <body>
        <ThemeProvider>
          <AuthLoader />
          <InboxStateSync />
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
