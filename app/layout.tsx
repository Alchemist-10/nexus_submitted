import type React from "react"
import type { Metadata } from "next"
import { Roboto, Roboto_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { ErrorBoundary } from "@/components/error-boundary"
import Iridescence from "@/components/ui/iridescence" // <-- IMPORT
import "./globals.css"

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-roboto",
})

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-roboto-mono",
})

export const metadata: Metadata = {
  title: "Nexus - Social Leaderboard",
  description: "A modern social leaderboard application",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${roboto.variable} ${robotoMono.variable} antialiased`}>
        {/* ADD THE IRIDESCENCE COMPONENT HERE */}
        <Iridescence
          // A dark teal color to complement your theme
          color={[0.05, 0.2, 0.2]}
          // A slower, more ambient speed
          speed={0.3}
          // We don't need it to react to the mouse for a subtle background
          mouseReact={false}
          // CSS classes to place it in the background
          className="fixed top-0 left-0 w-full h-full -z-10 opacity-30"
        />

        <ErrorBoundary>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange={false}>
            <Suspense
              fallback={
                <div className="min-h-screen bg-transparent flex items-center justify-center">
                  <div className="nexus-loading h-8 w-32 rounded-md"></div>
                </div>
              }
            >
              {/* Wrap children in a div to ensure it appears above the background */}
              <div className="relative z-0">
                {children}
              </div>
            </Suspense>
          </ThemeProvider>
        </ErrorBoundary>
        <Analytics />
      </body>
    </html>
  )
}