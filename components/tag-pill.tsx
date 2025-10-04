import type React from "react"
interface TagPillProps {
  children: React.ReactNode
  variant?: "default" | "small"
}

export function TagPill({ children, variant = "default" }: TagPillProps) {
  return (
    <span
      className={`
      nexus-tag inline-flex items-center rounded-full px-3 py-1 text-xs font-medium
      ${variant === "small" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"}
    `}
    >
      {children}
    </span>
  )
}
