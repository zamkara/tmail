import "./globals.css"
import type { Metadata } from "next"
import Link from "next/link"
import AdminSessionDialog from "@/components/admin/admin-session-dialog"
import BackendInboxSync from "@/components/backend-inbox-sync"
import { AuthLoader } from "@/components/auth-loader"
import { InboxStateSync } from "@/components/inbox-state-sync"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { getConfiguredPublicOrigin } from "@/lib/request-origin"

const siteDescription =
  "Create temporary email easily, quickly, and practically."
const metadataBase = new URL(
  getConfiguredPublicOrigin() || "http://localhost:3000"
)

export const metadata: Metadata = {
  metadataBase,
  title: "Pusat Mail",
  description: siteDescription,
  applicationName: "Pusat Mail",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/ic_tmail.svg", type: "image/svg+xml" }],
    shortcut: ["/ic_tmail.svg"],
    apple: [{ url: "/ic_tmail.svg", type: "image/svg+xml" }],
  },
  appleWebApp: {
    capable: true,
    title: "Pusat Mail",
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    url: "/",
    title: "Pusat Mail",
    description: siteDescription,
    siteName: "Pusat Mail",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pusat Mail",
    description: siteDescription,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="font-sans antialiased">
      <body>
        <ThemeProvider>
          <AuthLoader />
          <InboxStateSync />
          <BackendInboxSync />
          <TooltipProvider>
            <div className="h-svh overflow-y-auto">
              {children}
              <footer className="px-4 py-3 text-center text-xs text-muted-foreground">
                <div>
                  &copy; 2026{" "}
                  <a
                    href="https://t.me/premiumisme"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-foreground hover:underline"
                  >
                    Premiumisme
                  </a>
                </div>
                <nav
                  aria-label="Legal policies"
                  className="mt-1 flex items-center justify-center gap-1.5 font-bold"
                >
                  <Link
                    href="/terms-and-conditions#terms"
                    className="hover:text-foreground hover:underline"
                  >
                    Terms
                  </Link>
                  <span aria-hidden="true">&middot;</span>
                  <Link
                    href="/terms-and-conditions#privacy"
                    className="hover:text-foreground hover:underline"
                  >
                    Privacy
                  </Link>
                  <span aria-hidden="true">&middot;</span>
                  <Link
                    href="/terms-and-conditions#abuse"
                    className="hover:text-foreground hover:underline"
                  >
                    Abuse
                  </Link>
                </nav>
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
