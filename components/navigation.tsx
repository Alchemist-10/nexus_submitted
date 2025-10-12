"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ProfileDropdown } from "./profile-dropdown"
import { AdvancedSearchModal } from "./advanced-search-modal"
import { ThemeToggle } from "./theme-toggle"
import { NotificationBell } from "./notificationBell"

export function Navigation() {
  const pathname = usePathname()
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-primary to-secondary flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/25">
                <span className="text-primary-foreground font-bold text-lg">N</span>
              </div>
              <span className="hidden sm:inline font-bold text-xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent transition-all duration-300 group-hover:scale-105">
                Nexus
              </span>
            </Link>

            {/* Desktop Links */}
            <div className="hidden sm:flex items-center space-x-6">
              <Link
                href="/"
                className={cn(
                  "text-sm font-medium transition-all duration-300 hover:text-primary hover:scale-105 relative",
                  pathname === "/" ? "text-primary" : "text-muted-foreground",
                )}
              >
                Home
                {pathname === "/" && (
                  <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full animate-in slide-in-from-left-1 duration-300" />
                )}
              </Link>
              <Link
                href="/leaderboard"
                className={cn(
                  "text-sm font-medium transition-all duration-300 hover:text-primary hover:scale-105 relative",
                  pathname === "/leaderboard" ? "text-primary" : "text-muted-foreground",
                )}
              >
                Leaderboard
                {pathname === "/leaderboard" && (
                  <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full animate-in slide-in-from-left-1 duration-300" />
                )}
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Desktop Controls */}
            <div className="hidden sm:flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSearchModalOpen(true)}
                className="h-9 w-9 p-0 hover:bg-primary/10 transition-all duration-300 hover:scale-110"
              >
                <Search className="h-4 w-4" />
              </Button>
              <NotificationBell/>
              <ThemeToggle />
              <ProfileDropdown />
            </div>

            {/* Mobile Controls */}
            <div className="sm:hidden flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                aria-label="Search"
                onClick={() => setIsSearchModalOpen(true)}
                className="h-9 w-9 p-0 hover:bg-primary/10"
              >
                <Search className="h-4 w-4" />
              </Button>
              <NotificationBell/>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Toggle menu"
                onClick={toggleMobileMenu}
                className="h-9 w-9 p-0 hover:bg-primary/10"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Panel */}
        {isMobileMenuOpen && (
          <div className="sm:hidden border-t border-border bg-background/95">
            <div className="px-4 py-3 space-y-2">
              <Link href="/" onClick={toggleMobileMenu} className={cn("block px-3 py-2 rounded-md text-base font-medium", pathname === "/" ? "text-primary bg-primary/5" : "text-muted-foreground hover:bg-muted/50")}>
                Home
              </Link>
              <Link href="/leaderboard" onClick={toggleMobileMenu} className={cn("block px-3 py-2 rounded-md text-base font-medium", pathname === "/leaderboard" ? "text-primary bg-primary/5" : "text-muted-foreground hover:bg-muted/50")}>
                Leaderboard
              </Link>
              <div className="flex items-center justify-between pt-2 px-3 border-t border-border/50">
                <p className="text-sm font-medium text-muted-foreground">Theme</p>
                <ThemeToggle />
              </div>
               <div className="flex items-center justify-between px-3">
                 <p className="text-sm font-medium text-muted-foreground">Account</p>
                <ProfileDropdown />
              </div>
            </div>
          </div>
        )}
      </nav>

      <AdvancedSearchModal open={isSearchModalOpen} onOpenChange={setIsSearchModalOpen} />
    </>
  )
}