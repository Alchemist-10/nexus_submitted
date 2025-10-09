"use client"; 
import { useState } from "react"
import { ArrowUp, ArrowDown, Reply } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface CommentProps {
  id: string
  author: {
    name: string
    username: string
    avatar_url?: string
  }
  content: string
  timestamp: string
  upvotes: number
  isUpvoted?: boolean
  isDownvoted?: boolean
  depth?: number
  onReply?: (commentId: string) => void
}

export function Comment({
  id,
  author,
  content,
  timestamp,
  upvotes,
  isUpvoted: initialIsUpvoted = false,
  isDownvoted: initialIsDownvoted = false,
  depth = 0,
  onReply
}: CommentProps) {
  const [currentUpvotes, setCurrentUpvotes] = useState(upvotes)
  // MODIFICATION: Renamed state variables for consistency
  const [isUpvoted, setIsUpvoted] = useState(initialIsUpvoted)
  const [isDownvoted, setIsDownvoted] = useState(initialIsDownvoted)
  const [isVoting, setIsVoting] = useState(false)
  const [voteState, setVoteState] = useState<'up' | 'down' | null>(
    initialIsUpvoted ? 'up' : initialIsDownvoted ? 'down' : null
  )
  const { toast } = useToast()

  // MODIFICATION: Refactored voting logic to match the robust pattern from the post card
  const handleUpvote = async () => {
    if (isVoting) return
    setIsVoting(true)
    const oldVoteState = voteState;

    try {
      if (oldVoteState === 'up') {
        // Remove existing upvote
        await apiClient.removeCommentVote(id)
        setVoteState(null)
        setIsUpvoted(false)
        setCurrentUpvotes(prev => Math.max(0, prev - 1))
      } else {
        // Apply upvote (from neutral or from downvoted)
        await apiClient.voteComment(id, "up")
        setVoteState('up')
        setIsUpvoted(true)
        setIsDownvoted(false)
        setCurrentUpvotes(prev => prev + (oldVoteState === 'down' ? 2 : 1))
      }
    } catch (error: any) {
      toast({
        title: "Vote failed",
        description: error?.message || "Failed to register vote. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsVoting(false)
    }
  }

  // MODIFICATION: Refactored voting logic to match the robust pattern from the post card
  const handleDownvote = async () => {
    if (isVoting) return
    setIsVoting(true)
    const oldVoteState = voteState;

    try {
      if (oldVoteState === 'down') {
        // Remove downvote
        await apiClient.removeCommentVote(id)
        setVoteState(null)
        setIsDownvoted(false)
        setCurrentUpvotes(prev => prev + 1)
      } else {
        // Apply downvote (from neutral or from upvoted)
        await apiClient.voteComment(id, "down")
        setVoteState('down')
        setIsDownvoted(true)
        setIsUpvoted(false)
        setCurrentUpvotes(prev => Math.max(0, prev - (oldVoteState === 'up' ? 2 : 1)))
      }
    } catch (error: any) {
      toast({
        title: "Vote failed",
        description: error?.message || "Failed to register vote. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsVoting(false)
    }
  }

  return (
    <div className={`flex space-x-3 ${depth > 0 ? "ml-8 border-l border-border pl-4" : ""}`}>
      <Avatar className="h-8 w-8 mt-1">
        <AvatarImage src={author.avatar_url || "/placeholder.svg"} alt={author.name} />
        <AvatarFallback className="bg-muted text-xs">{author.name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <span className="font-medium text-sm text-foreground">{author.username}</span>
          <span className="text-muted-foreground text-xs">•</span>
          <span className="text-muted-foreground text-xs">{timestamp}</span>
        </div>

        <p className="text-sm text-foreground mb-2">{content}</p>

        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-muted/50 rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUpvote}
              disabled={isVoting}
              // MODIFICATION: Using updated state variable
              className={`h-6 w-6 p-0 transition-all duration-200 ${isUpvoted ? "text-primary bg-primary/20" : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                }`}
            >
              {/* MODIFICATION: Using updated state variable */}
              <ArrowUp className={`h-3 w-3 transition-transform duration-200 ${isUpvoted ? "scale-110" : ""}`} />
            </Button>
            <span className="text-xs font-medium px-2 min-w-[1.5rem] text-center font-mono">{currentUpvotes}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownvote}
              disabled={isVoting}
              // MODIFICATION: Using updated state variable
              className={`h-6 w-6 p-0 transition-all duration-200 ${isDownvoted ? "text-destructive bg-destructive/20" : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                }`}
            >
              {/* MODIFICATION: Using updated state variable */}
              <ArrowDown className={`h-3 w-3 transition-transform duration-200 ${isDownvoted ? "scale-110" : ""}`} />
            </Button>
          </div>

          {onReply && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
              onClick={() => onReply(id)}
            >
              <Reply className="h-3 w-3 mr-1" />
              Reply
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}