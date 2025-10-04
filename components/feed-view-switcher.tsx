"use client"
import { Button } from "@/components/ui/button"
import { Clock, Merge, TrendingUp, Heart } from "lucide-react"

interface FeedViewSwitcherProps {
  activeView: "timeline" | "merged" | "engaged" | "relevance"
  onViewChange: (view: "timeline" | "merged" | "engaged" | "relevance") => void
}

export function FeedViewSwitcher({ activeView, onViewChange }: FeedViewSwitcherProps) {
  const views = [
    { id: "timeline" as const, label: "Timeline", icon: Clock, description: "Latest posts first" },
    { id: "merged" as const, label: "Merged", icon: Merge, description: "Grouped discussions" },
    { id: "engaged" as const, label: "Engaged", icon: Heart, description: "Your interactions" },
    { id: "relevance" as const, label: "Relevance", icon: TrendingUp, description: "Most engaging" },
  ]

  return (
    <div className="flex items-center justify-center mb-8">
      {/* MODIFICATION: Changed from inline-flex to flex-wrap to prevent overflow */}
      <div className="flex flex-wrap justify-center gap-1 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 p-1 shadow-lg nexus-hover-lift">
        {views.map((view) => {
          const Icon = view.icon
          const isActive = activeView === view.id

          return (
            <Button
              key={view.id}
              variant={isActive ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewChange(view.id)}
              className={`
                relative px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 group
                ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md scale-105 nexus-glow"
                    : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                }
              `}
            >
              <Icon className="h-4 w-4 mr-2" />
              <span className="font-medium text-xs sm:text-sm">{view.label}</span>
              {isActive && (
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary-foreground rounded-full" />
              )}
            </Button>
          )
        })}
      </div>
    </div>
  )
}