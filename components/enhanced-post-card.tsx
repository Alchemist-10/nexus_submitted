"use client"

import { useState, useEffect } from "react"
import { ArrowUp, ArrowDown, MessageCircle, Share2, Bookmark, MoreHorizontal, UserPlus, LayoutList, Video } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CardContent, CardHeader } from "@/components/ui/card"
import { CardSpotlight } from "@/components/ui/card-spotlight"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/api"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CommentSection } from "@/components/comment-section";
import { useUser } from "@/hooks/use-user"

interface SessionItem {
  proposer_id: string;
  // common acceptance flags / status variants that backend might use
  accepted?: boolean;
  is_accepted?: boolean;
  status?: string;
  proposal_status?: string;
}

interface EnhancedPostCardProps {
  id: string;
  author: {
    id?: string;
    name: string;
    username: string;
    avatar_url: string;
  };
  content: string;
  timestamp: string;
  upvotes: number;
  commentCount: number;
  tags: string[] | null;
  google_meet_link?: string;
  sessions?: SessionItem[]; 
  onJoinClick?: () => void;
  isUpvoted?: boolean;
  isDownvoted?: boolean;
  images?: string[];
  postType?: string;
  title?: string;
  joinable?: boolean;
  onVoteSuccess?: () => void;
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
  sessions = [],
  joinable = true,
  google_meet_link,
  onJoinClick,
  isUpvoted: initialIsUpvoted = false,
  isDownvoted: initialIsDownvoted = false,
  onVoteSuccess
}: EnhancedPostCardProps) {
  const [isUpvoted, setIsUpvoted] = useState(initialIsUpvoted);
  const [isDownvoted, setIsDownvoted] = useState(initialIsDownvoted);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [currentUpvotes, setCurrentUpvotes] = useState(upvotes);
  const [isVoting, setIsVoting] = useState(false);
  const [isCommentSectionOpen, setIsCommentSectionOpen] = useState(false);
  const { toast } = useToast();
  const { user: currentUser } = useUser();
  const isAuthor = currentUser?.id === author?.id;

  // robust acceptance check to support different backend shapes
  const isSessionAccepted = (session?: SessionItem) => {
    if (!session) return false;
    if (typeof session.accepted === "boolean") return session.accepted;
    if (typeof session.is_accepted === "boolean") return session.is_accepted;
    if (typeof session.status === "string") return session.status.toLowerCase() === "accepted";
    if (typeof session.proposal_status === "string") return session.proposal_status.toLowerCase() === "accepted";
    return false;
  };

  // current user is an accepted proposer if there's a session for them that is accepted
  const isAcceptedProposer = Boolean(
    sessions && currentUser?.id && sessions.some(s => s.proposer_id === currentUser.id && isSessionAccepted(s))
  );

  // allow author OR accepted proposer to see the meet link
  const canSeeMeetLink = Boolean(google_meet_link) && (isAuthor || isAcceptedProposer);

  useEffect(() => {
    setCurrentUpvotes(upvotes);
    setIsUpvoted(initialIsUpvoted);
    setIsDownvoted(initialIsDownvoted);
  }, [upvotes, initialIsUpvoted, initialIsDownvoted]);

  const handleVote = async (voteType: 'up' | 'down') => {
    if (isVoting) return;
    setIsVoting(true);
    const previousState = { upvotes: currentUpvotes, isUpvoted, isDownvoted };
    const wasUpvoted = isUpvoted;
    const wasDownvoted = isDownvoted;
    let newUpvotes = currentUpvotes;
    if (voteType === 'up') {
      newUpvotes += wasUpvoted ? -1 : (wasDownvoted ? 2 : 1);
      setIsUpvoted(!wasUpvoted);
      setIsDownvoted(false);
    } else {
      newUpvotes += wasDownvoted ? 1 : (wasUpvoted ? -2 : -1);
      setIsDownvoted(!wasDownvoted);
      setIsUpvoted(false);
    }
    setCurrentUpvotes(newUpvotes);
    try {
      const isRemovingVote = (voteType === 'up' && wasUpvoted) || (voteType === 'down' && wasDownvoted);
      if (isRemovingVote) {
        await apiClient.removeVote(id);
      } else {
        await apiClient.votePost(id, voteType);
      }
      if (onVoteSuccess) onVoteSuccess();
    } catch (error) {
      toast({ title: "Vote failed", description: "Could not save your vote.", variant: "destructive" });
      setCurrentUpvotes(previousState.upvotes);
      setIsUpvoted(previousState.isUpvoted);
      setIsDownvoted(previousState.isDownvoted);
    } finally {
      setIsVoting(false);
    }
  };

  const getPostTypeColor = (type: string) => {
    const colors = { Project: "bg-blue-500/10 text-blue-500 border-blue-500/20", Academic: "bg-green-500/10 text-green-500 border-green-500/20", Guidance: "bg-purple-500/10 text-purple-500 border-purple-500/20", Announcement: "bg-orange-500/10 text-orange-500 border-orange-500/20", Question: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", Misc: "bg-red-500/10 text-red-500 border-red-500/20" };
    return colors[type as keyof typeof colors] || colors.Misc;
  };

  const UPVOTE_THRESHOLD = 1;
  const safeAuthor = author || { name: "Anonymous", username: "unknown", avatar_url: "" };

  return (
    <CardSpotlight className="group nexus-card nexus-slide-in bg-card/80 backdrop-blur-md border-border/50 p-0 rounded-2xl">
      <CardHeader className="p-4 sm:p-6 pb-3">
        {/* ... (Header content remains the same) ... */}
        <div className="flex items-start justify-between space-x-4">
          <div className="flex items-center space-x-3 min-w-0">
            <Avatar className="h-10 w-10 flex-shrink-0 ring-2 ring-primary/20">
              <AvatarImage src={safeAuthor.avatar_url || "/placeholder.svg"} alt={safeAuthor.name} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {(safeAuthor.name || 'A').split(" ").map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h3 className="font-semibold text-sm break-all">{safeAuthor.username}</h3>
                <Badge variant="outline" className={`text-xs ${getPostTypeColor(postType)}`}>{postType}</Badge>
              </div>
              <p className="text-xs text-muted-foreground break-all">@{safeAuthor.username} • {timestamp}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-50 group-hover:opacity-100 flex-shrink-0"><MoreHorizontal className="h-4 w-4" /></Button>
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
        {/* ... (Content, images, and tags remain the same) ... */}
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
          {(tags || []).map((tag, index) => (
            <Badge key={`${tag}-${index}`} variant="secondary" className="text-xs nexus-tag" style={{ animationDelay: `${index * 50}ms` }}>#{tag}</Badge>
          ))}
        </div>
        
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Vote and Comment Buttons */}
            <div className="flex items-center bg-muted/50 rounded-lg p-1 backdrop-blur-sm">
                <Button variant="ghost" size="sm" onClick={() => handleVote('up')} disabled={isVoting} className={`h-8 w-8 p-0 ${isUpvoted ? "text-primary bg-primary/20" : "text-muted-foreground hover:text-primary"}`}><ArrowUp className="h-4 w-4" /></Button>
                <span className="text-sm font-medium px-2 min-w-[2rem] text-center">{currentUpvotes}</span>
                <Button variant="ghost" size="sm" onClick={() => handleVote('down')} disabled={isVoting} className={`h-8 w-8 p-0 ${isDownvoted ? "text-destructive bg-destructive/20" : "text-muted-foreground hover:text-destructive"}`}><ArrowDown className="h-4 w-4" /></Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsCommentSectionOpen(!isCommentSectionOpen)} className="h-8 px-2 sm:px-3 text-muted-foreground hover:text-primary">
                <MessageCircle className="h-4 w-4 mr-1" />
                <span>{commentCount}</span>
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            
            {/* --- FINALIZED ACTION BUTTON LOGIC --- */}

            {sessions.length > 0 ? (
                // 1. If session is scheduled, show "Scheduled!"
                <div className="text-right">
                    <p className="text-sm font-semibold text-green-400">Session Scheduled!</p>
                </div>
            ) : (
                // 2. Otherwise, if joinable, show Join OR Manage
                joinable && currentUpvotes >= UPVOTE_THRESHOLD && (
                    isAuthor ? (
                        <Link href={`/posts/${id}/proposals`} passHref>
                            <Button className="nexus-glow bg-purple-500 hover:bg-purple-500/90 text-white h-8 px-3 text-xs font-bold">
                                <LayoutList className="h-4 w-4 mr-2" />
                                Manage
                            </Button>
                        </Link>
                    ) : (
                        <Link href={`/join/${id}`} passHref>
                            <Button className="nexus-glow bg-primary hover:bg-primary/90 text-primary-foreground h-8 px-3 text-xs font-bold">
                                <UserPlus className="h-4 w-4 mr-2" />
                                Join
                            </Button>
                        </Link>
                    )
                )
            )}

            {/* 3. Show Google Meet link if user has permission */}
            {canSeeMeetLink && (
                 <a href={google_meet_link} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="h-8 px-3 text-xs">
                        <Video className="h-4 w-4 mr-2" />
                        Join Meet
                    </Button>
                </a>
            )}
            
            <Button variant="ghost" size="sm" onClick={() => setIsBookmarked(!isBookmarked)} className={`h-8 w-8 p-0 ${isBookmarked ? "text-primary bg-primary/20" : "text-muted-foreground hover:text-primary"}`}><Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} /></Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"><Share2 className="h-4 w-4" /></Button>
          </div>
        </div>

        {isCommentSectionOpen && <CommentSection postId={id} />}
      </CardContent>
    </CardSpotlight>
  );
}

