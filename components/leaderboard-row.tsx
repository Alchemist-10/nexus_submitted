import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface LeaderboardRowProps {
  rank: number
  user: {
    name: string
    username?: string
    avatar?: string
  }
  reputation: number
  isCurrentUser?: boolean
}

export function LeaderboardRow({ rank, user, reputation, isCurrentUser = false }: LeaderboardRowProps) {
  const username = user.username || user.name.toLowerCase().replace(/\s+/g, "")

  // Helper function to get badge colors
  const getBadgeClass = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-500/90 text-yellow-950 border-yellow-600/50"; // Gold
      case 2:
        return "bg-slate-400/90 text-slate-950 border-slate-500/50"; // Silver
      case 3:
        return "bg-amber-600/90 text-amber-950 border-amber-700/50"; // Bronze
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div
      className={`flex items-center justify-between rounded-lg transition-colors ${isCurrentUser ? "bg-primary/10" : ""
        }`}
    >
      <div className="flex items-center space-x-4">
        <div className="w-8 text-center font-bold">
          {rank <= 3 ? (
            <Badge
              // MODIFICATION: Using custom classes instead of variants
              className={cn(
                "w-6 h-6 rounded-full p-0 flex items-center justify-center border",
                getBadgeClass(rank)
              )}
            >
              {rank}
            </Badge>
          ) : (
            <span className="text-muted-foreground font-medium text-sm">{rank}</span>
          )}
        </div>

        <Avatar className="h-10 w-10">
          <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
          <AvatarFallback className="bg-muted">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>

        <div>
          <Link
            href={`/profile/${username}`}
            className="font-medium text-foreground hover:text-primary transition-colors"
          >
            {user.username}
          </Link>
          {isCurrentUser && <div className="text-xs text-primary">You</div>}
        </div>
      </div>

      <div className="text-right">
        <div className="font-bold text-foreground">{reputation.toLocaleString()}</div>
        <div className="text-xs text-muted-foreground">Reputation</div>
      </div>
    </div>
  )
}