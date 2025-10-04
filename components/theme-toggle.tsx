"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { withErrorBoundary } from "@/components/error-boundary"

function ThemeToggleComponent() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const handleToggleTheme = React.useCallback(() => {
    try {
      const newTheme = theme === "light" ? "dark" : "light"
      setTheme(newTheme)
      console.log("[v0] Theme toggled to:", newTheme)
    } catch (error) {
      console.error("[v0] Error toggling theme:", error)
      // Fallback: try to set to opposite of current theme or default to dark
      try {
        setTheme("dark")
      } catch (fallbackError) {
        console.error("[v0] Fallback theme setting failed:", fallbackError)
      }
    }
  }, [theme, setTheme])

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
        <div className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggleTheme}
      className="h-9 w-9 p-0 hover:bg-primary/10 transition-all duration-300 hover:scale-110 nexus-interactive"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

export const ThemeToggle = withErrorBoundary(ThemeToggleComponent)
