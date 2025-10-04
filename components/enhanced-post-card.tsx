// enhanced-post-card.tsx
"use client"

import { useState, useEffect } from "react"
import { ArrowUp, ArrowDown, MessageCircle, Share2, Bookmark, MoreHorizontal, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { Comment as CommentComponent } from "@/components/comment"
import type { Comment } from "@/lib/types"
import { apiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface CommentWithUI {
  id: string
  post_id: string
  author_id: string
  content: string
  upvotes: number
  created_at: string
  updated_at: string
  timestamp: string
  author: {
    name: string
    username: string
    avatar_url: string
  }
  isUpvoted?: boolean
  isDownvoted?: boolean
  depth?: number
}

interface EnhancedPostCardProps {
  id: string
  author: {
    name: string
    username: string
    avatar_url: string
  }
  content: string
  timestamp: string
  upvotes: number
  commentCount: number
  tags: string[]
  isUpvoted?: boolean
  isDownvoted?: boolean
  images?: string[]
  postType?: string
  title?: string
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
  isUpvoted: initialIsUpvoted = false,
  isDownvoted: initialIsDownvoted = false,
}: EnhancedPostCardProps) {
  const [isUpvotedState, setIsUpvoted] = useState(initialIsUpvoted)
  const [isDownvoted, setIsDownvoted] = useState(initialIsDownvoted)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [currentUpvotes, setCurrentUpvotes] = useState(upvotes)
  const [isVoting, setIsVoting] = useState(false)
  const [voteState, setVoteState] = useState<'up' | 'down' | null>(initialIsUpvoted ? 'up' : initialIsDownvoted ? 'down' : null)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<CommentWithUI[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [submittingComment, setSubmittingComment] = useState(false)
  const [currentCommentCount, setCurrentCommentCount] = useState(commentCount)
  const { toast } = useToast()

  useEffect(() => {
    if (!isVoting) setCurrentUpvotes(upvotes)
  }, [upvotes, isVoting])

  const loadComments = async () => {
    if (loadingComments) return
    setLoadingComments(true)
    try {
      const fetchedComments = await apiClient.getComments(id)
      // Transform the comments to match our UI interface
      const transformedComments: CommentWithUI[] = fetchedComments.map(comment => ({
        ...comment,
        timestamp: new Date(comment.created_at).toLocaleString(),
        author: {
          name: comment.author?.full_name || 'Unknown',
          username: comment.author?.username || 'unknown',
          // MODIFICATION: Changed `avatar` key to `avatar_url` to match component props
          avatar_url: comment.author?.avatar_url || '/placeholder.svg'
        },
        isUpvoted: comment.user_vote === 'up',
        isDownvoted: comment.user_vote === 'down',
        depth: 0
      }))
      setComments(transformedComments)
    } catch (error: any) {
      toast({
        title: "Failed to load comments",
        description: error?.message || "Could not load comments. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingComments(false)
    }
  }

  const handleCommentClick = async () => {
    if (!showComments) {
      await loadComments()
    }
    setShowComments(!showComments)
  }

  const handleSubmitComment = async () => {
    if (!newComment.trim() || submittingComment) return
    setSubmittingComment(true)
    try {
      const comment = await apiClient.createComment({
        postId: id,
        content: newComment.trim()
      })
      // Transform the new comment to match our UI interface
      const transformedComment: CommentWithUI = {
        ...comment,
        timestamp: new Date(comment.created_at).toLocaleString(),
        author: {
          name: comment.author?.full_name || 'Unknown',
          username: comment.author?.username || 'unknown',
          // MODIFICATION: Changed `avatar` key to `avatar_url` to match component props
          avatar_url: comment.author?.avatar_url || '/placeholder.svg'
        },
        isUpvoted: false,
        isDownvoted: false,
        depth: 0
      }
      setComments(prev => [...prev, transformedComment])
      setNewComment("")
      setCurrentCommentCount(prev => prev + 1)
      toast({
        title: "Comment posted",
        description: "Your comment has been posted successfully.",
      })
    } catch (error: any) {
      toast({
        title: "Failed to post comment",
        description: error?.message || "Could not post comment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleReply = (commentId: string) => {
    // For now, just focus on the comment input
    // In a full implementation, you might want to show a reply form
    setNewComment(`@${commentId} `)
  }

  const handleUpvote = async () => {
    if (isVoting) return
    setIsVoting(true)

    try {
      if (voteState === 'up') {
        // remove existing upvote
        const res = await apiClient.removeVote(id)
        if (res && (res as any).voteType === null) {
          setVoteState(null)
          setIsUpvoted(false)
          setIsDownvoted(false)
        }
      } else {
        // apply upvote (from neutral or from downvoted)
        const res = await apiClient.votePost(id, "up")
        if (res && (res as any).voteType === 'up') {
          setVoteState('up')
          setIsUpvoted(true)
          setIsDownvoted(false)
        }
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

  const handleDownvote = async () => {
    if (isVoting) return
    setIsVoting(true)

    try {
      if (voteState === 'down') {
        // remove downvote
        const res = await apiClient.removeVote(id)
        if (res && (res as any).voteType === null) {
          setVoteState(null)
          setIsUpvoted(false)
          setIsDownvoted(false)
        }
      } else {
        // apply downvote (from neutral or from upvoted)
        const res = await apiClient.votePost(id, "down")
        if (res && (res as any).voteType === 'down') {
          setVoteState('down')
          setIsUpvoted(false)
          setIsDownvoted(true)
        }
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

  const getPostTypeColor = (type: string) => {
    const colors = {
      Project: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      Academic: "bg-green-500/10 text-green-500 border-green-500/20",
      Guidance: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      Announcement: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      Question: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      Misc: "bg-red-500/10 text-red-500 border-red-500/20",
    }
    return colors[type as keyof typeof colors] || colors.Misc
  }

  return (
    <Card className="group nexus-card nexus-slide-in hover:shadow-xl transition-all duration-300 hover:border-primary/30 bg-card/80 backdrop-blur-md border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between space-x-2 sm:space-x-4">
          <div className="flex items-center space-x-3 min-w-0">
            <Avatar className="h-10 w-10 flex-shrink-0 ring-2 ring-primary/20 transition-all duration-300 group-hover:ring-primary/40 group-hover:scale-105">
              <AvatarImage src={author.avatar_url || "/placeholder.svg"} alt={author.name} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {author.name ? author.name.split(" ").map((n) => n[0]).join("") : author.username?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h3 className="font-semibold text-sm transition-colors duration-200 group-hover:text-primary break-all">
                  {author.username}
                </h3>
                <Badge variant="outline" className={`text-xs transition-all duration-200 hover:scale-105 ${getPostTypeColor(postType)}`}>
                  {postType}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground transition-colors duration-200 break-all">
                @{author.name} • {timestamp}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-50 group-hover:opacity-100 flex-shrink-0 transition-all duration-300 hover:bg-primary/10 hover:scale-110">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="animate-in slide-in-from-top-2 duration-200">
              <DropdownMenuItem className="cursor-pointer hover:bg-primary/10 transition-colors">Report Post</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer hover:bg-primary/10 transition-colors">Hide Post</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer hover:bg-primary/10 transition-colors">Copy Link</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {title && <h2 className="text-lg font-bold mb-2 text-foreground">{title}</h2>}
        <p className="text-sm text-foreground mb-4 leading-relaxed text-pretty transition-colors duration-200">{content}</p>

        {images.length > 0 && (
          <div
            className={cn("grid gap-2 mb-4", {
              "grid-cols-1": images.length === 1,
              "grid-cols-2": images.length === 2,
              "grid-cols-2 sm:grid-cols-3": images.length >= 3,
            })}
          >
            {images.map((image, index) => (
              <div key={index} className="aspect-video bg-muted rounded-lg overflow-hidden group/image">
                <img
                  src={image || "/placeholder.svg"}
                  alt={`Post image ${index + 1}`}
                  className="w-full h-full object-cover transition-all duration-500 group-hover/image:scale-110"
                  onError={(e) => { e.currentTarget.src = "/placeholder.svg" }}
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag, index) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-xs nexus-tag nexus-interactive transition-all duration-200 hover:bg-primary/20 cursor-pointer"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              #{tag}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <div className="flex items-center bg-muted/50 rounded-lg p-1 backdrop-blur-sm">
              <Button variant="ghost" size="sm" onClick={handleUpvote} disabled={isVoting} className={`h-8 w-8 p-0 nexus-button transition-all duration-200 ${isUpvotedState ? "text-primary bg-primary/20" : "text-muted-foreground hover:text-primary hover:bg-primary/10"}`}>
                <ArrowUp className={`h-4 w-4 transition-transform duration-200 ${isUpvotedState ? "scale-110" : ""}`} />
              </Button>
              <span className="text-sm font-medium px-2 min-w-[2rem] text-center transition-all duration-200 font-mono">{currentUpvotes}</span>
              <Button variant="ghost" size="sm" onClick={handleDownvote} disabled={isVoting} className={`h-8 w-8 p-0 nexus-button transition-all duration-200 ${isDownvoted ? "text-destructive bg-destructive/20" : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"}`}>
                <ArrowDown className={`h-4 w-4 transition-transform duration-200 ${isDownvoted ? "scale-110" : ""}`} />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCommentClick}
              className={`h-8 px-2 sm:px-3 transition-all duration-200 nexus-button hover:bg-primary/10 ${showComments ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary"
                }`}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              <span className="text-xs font-medium font-mono">{currentCommentCount}</span>
            </Button>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <Button variant="ghost" size="sm" onClick={() => setIsBookmarked(!isBookmarked)} className={`h-8 w-8 p-0 nexus-button transition-all duration-200 ${isBookmarked ? "text-primary bg-primary/20" : "text-muted-foreground hover:text-primary hover:bg-primary/10"}`}>
              <Bookmark className={`h-4 w-4 transition-all duration-200 ${isBookmarked ? "fill-current scale-110" : ""}`} />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary transition-all duration-200 nexus-button hover:bg-primary/10">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="border-t border-border/50 pt-4 mt-4">
            <div className="space-y-4">
              {/* Comment Input */}
              <div className="flex space-x-2">
                <Textarea
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 min-h-[80px] resize-none"
                  disabled={submittingComment}
                />
                <Button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || submittingComment}
                  size="sm"
                  className="self-end"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              {/* Comments List */}
              <div className="space-y-3">
                {loadingComments ? (
                  <div className="text-center text-sm text-muted-foreground py-4">
                    Loading comments...
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-4">
                    No comments yet. Be the first to comment!
                  </div>
                ) : (
                  comments.map((comment) => (
                    <CommentComponent
                      key={comment.id}
                      id={comment.id}
                      author={comment.author}
                      content={comment.content}
                      timestamp={comment.timestamp}
                      upvotes={comment.upvotes}
                      isUpvoted={comment.isUpvoted}
                      isDownvoted={comment.isDownvoted}
                      depth={comment.depth || 0}
                      onReply={handleReply}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}