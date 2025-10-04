"use client"

import { ArrowUp, MessageCircle, Share } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TagPill } from "./tag-pill"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"

interface PostCardProps {
  id: string
  author: {
    name: string
    username?: string
    avatar?: string
  }
  content: string
  timestamp: string
  upvotes: number
  commentCount: number
  tags: string[]
  isUpvoted?: boolean
}

export function PostCard({
  id,
  author,
  content,
  timestamp,
  upvotes,
  commentCount,
  tags,
  isUpvoted = false,
}: PostCardProps) {
  const username = author.username || author.name.toLowerCase().replace(/\s+/g, "")

  return (
    <Card className="nexus-card p-6 hover:border-primary/20 transition-colors">
      <div className="flex items-start space-x-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src={author.avatar || "/placeholder.svg"} alt={author.name} />
          <AvatarFallback className="bg-muted">{author.name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <Link
              href={`/profile/${username}`}
              className="font-medium text-foreground hover:text-primary transition-colors"
            >
              {author.name}
            </Link>
            <span className="text-muted-foreground text-sm">•</span>
            <span className="text-muted-foreground text-sm">{timestamp}</span>
          </div>

          <Link href={`/post/${id}`} className="block group">
            <p className="text-foreground mb-4 group-hover:text-primary transition-colors cursor-pointer">{content}</p>
          </Link>

          <div className="flex flex-wrap gap-2 mb-4">
            {tags.map((tag) => (
              <TagPill key={tag} variant="small">
                {tag}
              </TagPill>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              className={`flex items-center space-x-2 ${
                isUpvoted ? "text-secondary" : "text-muted-foreground"
              } hover:text-secondary`}
            >
              <ArrowUp className="h-4 w-4" />
              <span>{upvotes}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="flex items-center space-x-2 text-muted-foreground hover:text-primary"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{commentCount}</span>
            </Button>

            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
              <Share className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
