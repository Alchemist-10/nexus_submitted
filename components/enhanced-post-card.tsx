"use client"

import { useState, useEffect } from "react"
import { ArrowUp, ArrowDown, MessageCircle, Share2, Bookmark, MoreHorizontal, UserPlus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CardContent, CardHeader } from "@/components/ui/card"
import { CardSpotlight } from "@/components/ui/card-spotlight"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EnhancedPostCardProps {
  id: string;
  author: {
    name: string;
    username: string;
    avatar: string;
  };
  content: string;
  timestamp: string;
  upvotes: number;
  commentCount: number;
  tags: string[];
  isUpvoted?: boolean;
  isDownvoted?: boolean;
  images?: string[];
  postType?: string;
  title?: string;
  joinable?: boolean;
}

export function EnhancedPostCard({
  id,
  author,
  content,
  timestamp,
  upvotes,
  commentCount,
  tags = [],
  images = [],
  postType = "Misc",
  title,
  joinable = true,
  isUpvoted: initialIsUpvoted = false,
  isDownvoted: initialIsDownvoted = false,
}: EnhancedPostCardProps) {
  const [isUpvotedState, setIsUpvoted] = useState(initialIsUpvoted);
  const [isDownvoted, setIsDownvoted] = useState(initialIsDownvoted);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [currentUpvotes, setCurrentUpvotes] = useState(upvotes);
  const [isVoting, setIsVoting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setCurrentUpvotes(upvotes);
  }, [upvotes]);

  const handleVote = async (voteType: 'up' | 'down') => {
    // This is a placeholder. You should replace it with your actual API calls.
    console.log(`Voting ${voteType} on post ${id}`);
    if (voteType === 'up') {
      const wasUpvoted = isUpvotedState;
      const wasDownvoted = isDownvoted;
      setCurrentUpvotes(currentUpvotes + (wasUpvoted ? -1 : (wasDownvoted ? 2 : 1)));
      setIsUpvoted(!wasUpvoted);
      if (!wasUpvoted) setIsDownvoted(false);
    } else {
      const wasUpvoted = isUpvotedState;
      const wasDownvoted = isDownvoted;
      setCurrentUpvotes(currentUpvotes + (wasDownvoted ? 1 : (wasUpvoted ? -2 : -1)));
      setIsDownvoted(!wasDownvoted);
      if (!wasDownvoted) setIsUpvoted(false);
    }
  };

  const getPostTypeColor = (type: string) => {
    const colors = {
      Project: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      Academic: "bg-green-500/10 text-green-500 border-green-500/20",
      Guidance: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      Announcement: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      Question: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      Misc: "bg-red-500/10 text-red-500 border-red-500/20",
    };
    return colors[type as keyof typeof colors] || colors.Misc;
  };

  const UPVOTE_THRESHOLD = 3;

  // FIX: Provide a default author object to prevent crashes if the prop is not ready
  const safeAuthor = author || { name: "Anonymous", username: "unknown", avatar: "" };

  return (
    <CardSpotlight className="group nexus-card nexus-slide-in bg-card/80 backdrop-blur-md border-border/50 p-0 rounded-2xl">
      <CardHeader className="p-4 sm:p-6 pb-3">
        <div className="flex items-start justify-between space-x-4">
          <div className="flex items-center space-x-3 min-w-0">
            <Avatar className="h-10 w-10 flex-shrink-0 ring-2 ring-primary/20">
              <AvatarImage src={safeAuthor.avatar || "/placeholder.svg"} alt={safeAuthor.name} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {/* FIX: Use the safe author name and add a check for the name itself */}
                {(safeAuthor.name || 'A').split(" ").map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h3 className="font-semibold text-sm break-all">{safeAuthor.name}</h3>
                <Badge variant="outline" className={`text-xs ${getPostTypeColor(postType)}`}>{postType}</Badge>
              </div>
              <p className="text-xs text-muted-foreground break-all">@{safeAuthor.username} • {timestamp}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-50 group-hover:opacity-100 flex-shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Report Post</DropdownMenuItem>
              <DropdownMenuItem>Hide Post</DropdownMenuItem>
              <DropdownMenuItem>Copy Link</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 pt-0">
        {title && <h2 className="text-lg font-bold mb-2 text-foreground">{title}</h2>}
        <p className="text-sm text-foreground mb-4 leading-relaxed text-pretty">{content}</p>

        {images && images.length > 0 && (
          <div className={cn("grid gap-2 mb-4", { "grid-cols-1": images.length === 1, "grid-cols-2": images.length === 2, "grid-cols-2 sm:grid-cols-3": images.length >= 3 })}>
            {images.map((image, index) => (
              <div key={index} className="aspect-video bg-muted rounded-lg overflow-hidden group/image">
                <img src={image || "/placeholder.svg"} alt={`Post image ${index + 1}`} className="w-full h-full object-cover transition-all duration-500 group-hover/image:scale-110" onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { e.currentTarget.src = "/placeholder.svg" }} />
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag, index) => (
            <Badge key={tag} variant="secondary" className="text-xs nexus-tag" style={{ animationDelay: `${index * 50}ms` }}>#{tag}</Badge>
          ))}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <div className="flex items-center bg-muted/50 rounded-lg p-1 backdrop-blur-sm">
              <Button variant="ghost" size="sm" onClick={() => handleVote('up')} disabled={isVoting} className={`h-8 w-8 p-0 ${isUpvotedState ? "text-primary bg-primary/20" : "text-muted-foreground hover:text-primary hover:bg-primary/10"}`}><ArrowUp className={`h-4 w-4 ${isUpvotedState ? "scale-110" : ""}`} /></Button>
              <span className="text-sm font-medium px-2 min-w-[2rem] text-center font-mono">{currentUpvotes}</span>
              <Button variant="ghost" size="sm" onClick={() => handleVote('down')} disabled={isVoting} className={`h-8 w-8 p-0 ${isDownvoted ? "text-destructive bg-destructive/20" : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"}`}><ArrowDown className={`h-4 w-4 ${isDownvoted ? "scale-110" : ""}`} /></Button>
            </div>
            <Button variant="ghost" size="sm" className="h-8 px-2 sm:px-3 text-muted-foreground hover:text-primary">
              <MessageCircle className="h-4 w-4 mr-1" />
              <span className="text-xs font-medium font-mono">{commentCount}</span>
            </Button>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2">
            {joinable && currentUpvotes >= UPVOTE_THRESHOLD && (
              <Link href={`/join/${id}`} passHref>
                <Button className="nexus-glow bg-primary hover:bg-primary/90 text-primary-foreground h-8 px-3 text-xs font-bold">
                  <UserPlus className="h-4 w-4 mr-2"/>
                  Join
                </Button>
              </Link>
            )}
            
            <Button variant="ghost" size="sm" onClick={() => setIsBookmarked(!isBookmarked)} className={`h-8 w-8 p-0 ${isBookmarked ? "text-primary bg-primary/20" : "text-muted-foreground hover:text-primary hover:bg-primary/10"}`}><Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-current scale-110" : ""}`} /></Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"><Share2 className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardContent>
    </CardSpotlight>
  );
}

