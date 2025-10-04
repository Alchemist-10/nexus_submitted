"use client"
import { authService } from "@/lib/auth"
import { useState, useCallback, useEffect } from "react"
import { User, Activity, Settings, LogOut } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import Link from "next/link"
import { withErrorBoundary } from "@/components/error-boundary"

function ProfileDropdownComponent() {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [user, setUser] = useState<{ name: string; username: string; initials: string } | null>(null)

  useEffect(() => {
    let unsub: any
      ; (async () => {
        const u = await authService.getCurrentUser()
        if (u) {
          const name = u.full_name || u.username
          const initials = (name || "?")
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()
          setUser({ name, username: u.username, initials })
        }
        const sub = authService.onAuthStateChange(async (au) => {
          if (!au) return setUser(null)
          const fresh = await authService.getCurrentUser()
          if (fresh) {
            const name = fresh.full_name || fresh.username
            const initials = (name || "?")
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()
            setUser({ name, username: fresh.username, initials })
          }
        })
        unsub = sub?.data?.subscription
      })()
    return () => {
      try { unsub?.unsubscribe?.() } catch { }
    }
  }, [])

  const handleLogout = useCallback(() => {
    try {
      authService.signOut()
      setShowLogoutDialog(false)

      if (typeof window !== "undefined") {
        // Use Next.js router if available, otherwise fallback to window.location
        const { router } = require("next/router")
        if (router) {
          router.push("/login")
        } else {
          window.location.href = "/login"
        }
      }
    } catch (error) {
      console.error("[v0] Error during logout:", error)
      // Fallback to window.location if router fails
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }
    }
  }, [])

  const handleShowLogoutDialog = useCallback(() => {
    try {
      setShowLogoutDialog(true)
    } catch (error) {
      console.error("[v0] Error showing logout dialog:", error)
    }
  }, [])

  const handleCloseLogoutDialog = useCallback(() => {
    try {
      setShowLogoutDialog(false)
    } catch (error) {
      console.error("[v0] Error closing logout dialog:", error)
    }
  }, [])

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full nexus-hover-lift">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-sm font-medium bg-primary/10 text-primary">
                {user?.initials || "?"}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 animate-in slide-in-from-top-2 duration-200" align="end" forceMount>
          <div className="flex items-center justify-start gap-2 p-2">
            <div className="flex flex-col space-y-1 leading-none">
              <p className="font-medium">{user?.name || "Guest"}</p>
              {user && <p className="w-[200px] truncate text-sm text-muted-foreground">@{user.username}</p>}
            </div>
          </div>
          <DropdownMenuSeparator />
          {user && (
            <DropdownMenuItem asChild>
              <Link
                href={`/profile/${user.username}`}
                className="cursor-pointer transition-all duration-200 hover:bg-primary/10"
              >
                <User className="mr-2 h-4 w-4" />
                <span>View Profile</span>
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href="/my-activity" className="cursor-pointer transition-all duration-200 hover:bg-primary/10">
              <Activity className="mr-2 h-4 w-4" />
              <span>My Activity</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings" className="cursor-pointer transition-all duration-200 hover:bg-primary/10">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-destructive focus:text-destructive transition-all duration-200 hover:bg-destructive/10"
            onClick={handleShowLogoutDialog}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="animate-in zoom-in-95 duration-200">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be redirected to the login page and will need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseLogoutDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90">
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export const ProfileDropdown = withErrorBoundary(ProfileDropdownComponent)
