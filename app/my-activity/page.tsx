"use client"

import { Navigation } from "@/components/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageSquare, ArrowUp, Clock, Edit } from "lucide-react"
import Link from "next/link"

// Mock user activity data
const userActivity = {
  posts: [
    {
      id: "1",
      title: "My Journey with Machine Learning",
      content: "Sharing my experience learning ML over the past year...",
      upvotes: 24,
      comments: 8,
      timeAgo: "1 day ago",
      tags: ["AI/ML", "Personal"],
    },
    {
      id: "2",
      title: "React Hooks Deep Dive",
      content: "Understanding the intricacies of React hooks and when to use them...",
      upvotes: 18,
      comments: 5,
      timeAgo: "3 days ago",
      tags: ["React", "JavaScript"],
    },
  ],
  comments: [
    {
      id: "1",
      postTitle: "Database Optimization Techniques",
      postId: "123",
      content: "Great insights! I've been using similar techniques in my projects.",
      timeAgo: "2 hours ago",
    },
    {
      id: "2",
      postTitle: "Getting Started with TypeScript",
      postId: "124",
      content: "This helped me understand interfaces much better. Thanks!",
      timeAgo: "1 day ago",
    },
  ],
}

export default function MyActivityPage() {
  return (
    // MODIFICATION: Changed bg-background to bg-transparent
    <div className="min-h-screen bg-transparent">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            {/* MODIFICATION: Added gradient to title for consistency */}
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              My Activity
            </h1>
            <p className="text-muted-foreground">View all your posts and comments in one place</p>
          </div>

          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
              <TabsTrigger value="posts">My Posts</TabsTrigger>
              <TabsTrigger value="comments">My Comments</TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="space-y-4 mt-6">
              {userActivity.posts.map((post) => (
                // MODIFICATION: Added nexus-card styling for cohesive look
                <Card key={post.id} className="nexus-card bg-card/80 backdrop-blur-md border-border/50">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start justify-between mb-3 gap-4">
                      <Link href={`/post/${post.id}`} className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg hover:text-primary transition-colors truncate">{post.title}</h3>
                      </Link>
                      <Link href={`/post/${post.id}/edit`} className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0">
                        <Edit className="h-4 w-4" />
                      </Link>
                    </div>

                    <p className="text-muted-foreground mb-4 line-clamp-2">{post.content}</p>

                    {/* MODIFICATION: Made this section responsive */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1.5">
                          <Clock className="h-4 w-4" />
                          <span>{post.timeAgo}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <ArrowUp className="h-4 w-4" />
                          <span>{post.upvotes}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <MessageSquare className="h-4 w-4" />
                          <span>{post.comments}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {post.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="comments" className="space-y-4 mt-6">
              {userActivity.comments.map((comment) => (
                <Card key={comment.id} className="nexus-card bg-card/80 backdrop-blur-md border-border/50">
                  <CardContent className="p-4 sm:p-6">
                    <div className="mb-3">
                      <Link href={`/post/${comment.postId}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                        Commented on: <span className="font-medium text-foreground">{comment.postTitle}</span>
                      </Link>
                    </div>

                    <p className="text-foreground mb-3">{comment.content}</p>

                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 mr-1.5" />
                      <span>{comment.timeAgo}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}