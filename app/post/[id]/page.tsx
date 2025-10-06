import { Navigation } from "@/components/navigation"
import { TagPill } from "@/components/tag-pill"
import { Comment } from "@/components/comment"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ArrowUp, MessageCircle, Share, ArrowLeft } from "lucide-react"
import Link from "next/link"

// Mock data for the post and comments
const mockPost = {
  id: "1",
  author: { name: "Alex Chen", avatar: "/placeholder.svg?height=40&width=40" },
  content:
    "Just discovered this amazing new algorithm for optimizing neural networks. The performance improvements are incredible! I've been working on this for months and finally got breakthrough results. The key insight was to use adaptive learning rates combined with momentum-based optimization. Here's what I found...",
  timestamp: "2h ago",
  upvotes: 42,
  commentCount: 8,
  tags: ["AI/ML", "Algorithms", "Research"],
  isUpvoted: true,
}

const mockComments = [
  {
    author: { name: "Sarah Kim", avatar: "/placeholder.svg?height=32&width=32" },
    content: "This is fascinating! Could you share more details about the adaptive learning rate implementation?",
    timestamp: "1h ago",
    upvotes: 12,
    isUpvoted: false,
  },
  {
    author: { name: "Marcus Johnson", avatar: "/placeholder.svg?height=32&width=32" },
    content:
      "Great work! I've been struggling with similar optimization problems. Would love to see the code if you're willing to share.",
    timestamp: "45m ago",
    upvotes: 8,
    isUpvoted: true,
  },
  {
    author: { name: "Emily Rodriguez", avatar: "/placeholder.svg?height=32&width=32" },
    content: "Have you compared this with Adam optimizer? I'm curious about the performance differences.",
    timestamp: "30m ago",
    upvotes: 5,
    isUpvoted: false,
  },
]

export default function ThreadPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-muted-foreground hover:text-primary mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Timeline</span>
          </Link>

          {/* Main Post */}
          <Card className="nexus-card p-6 mb-8">
            <div className="flex items-start space-x-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={mockPost.author.avatar || "/placeholder.svg"} alt={mockPost.author.name} />
                <AvatarFallback className="bg-muted">{mockPost.author.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="font-semibold text-foreground">{mockPost.author.name}</span>
                  <span className="text-muted-foreground text-sm">•</span>
                  <span className="text-muted-foreground text-sm">{mockPost.timestamp}</span>
                </div>

                <p className="text-foreground mb-6 leading-relaxed">{mockPost.content}</p>

                <div className="flex flex-wrap gap-2 mb-6">
                  {mockPost.tags.map((tag) => (
                    <TagPill key={tag}>{tag}</TagPill>
                  ))}
                </div>

                <div className="flex items-center space-x-6">
                  <Button
                    variant="ghost"
                    className={`flex items-center space-x-2 ${mockPost.isUpvoted ? "text-secondary" : "text-muted-foreground"
                      } hover:text-secondary`}
                  >
                    <ArrowUp className="h-5 w-5" />
                    <span className="font-medium">{mockPost.upvotes}</span>
                  </Button>

                  <Button
                    variant="ghost"
                    className="flex items-center space-x-2 text-muted-foreground hover:text-primary"
                  >
                    <MessageCircle className="h-5 w-5" />
                    <span>{mockPost.commentCount}</span>
                  </Button>

                  <Button variant="ghost" className="text-muted-foreground hover:text-primary">
                    <Share className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Comment Form */}
          <Card className="nexus-card p-6 mb-8">
            <div className="flex space-x-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src="/placeholder.svg?height=40&width=40" alt="You" />
                <AvatarFallback className="bg-muted">U</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea placeholder="Write a comment..." className="mb-4 min-h-[100px] resize-none" />
                <div className="flex justify-end">
                  <Button>Post Comment</Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Comments */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-foreground">Comments ({mockComments.length})</h3>

            {mockComments.map((comment, index) => (
              <Comment key={index} {...comment} />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
