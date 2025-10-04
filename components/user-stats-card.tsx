import type React from "react"
import { Card } from "@/components/ui/card"

interface UserStatsCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
}

export function UserStatsCard({ label, value, icon }: UserStatsCardProps) {
  return (
    <Card className="nexus-card p-4 text-center">
      <div className="flex flex-col items-center space-y-2">
        {icon && <div className="text-primary">{icon}</div>}
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </Card>
  )
}
