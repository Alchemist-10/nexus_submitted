"use client"

import { Navigation } from "@/components/navigation"
import { UserStatsCard } from "@/components/user-stats-card"
import { PostCard } from "@/components/post-card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Github,
  Twitter,
  Linkedin,
  Globe,
  MapPin,
  Calendar,
  Boxes as Nodes,
  Trophy,
  MessageSquare,
  ThumbsUp,
} from "lucide-react"

// Mock user data
const mockUser = {
  name: "Alex Chen",
  username: "alexchen",
  avatar: "/placeholder.svg?height=120&width=120",
  bio: "AI/ML researcher passionate about neural networks and optimization algorithms. Currently working on next-gen deep learning architectures.",
  location: "San Francisco, CA",
  joinDate: "March 2023",
  stats: {
    nodes: 34,
    reputation: 2847,
    posts: 156,
    upvotes: 1243,
  },
  interests: ["Python", "AI/ML", "Academics", "CP", "Music"],
  socials: {
    github: "alexchen",
    twitter: "alexchen_ai",
    linkedin: "alex-chen-ai",
    website: "alexchen.dev",
  },
}

const mockUserPosts = [
  {
    id: "1",
    author: { name: "Alex Chen", avatar: "/placeholder.svg?height=40&width=40" },
    content:
      "Just discovered this amazing new algorithm for optimizing neural networks. The performance improvements are incredible!",
    timestamp: "2h ago",
    upvotes: 42,
    commentCount: 8,
    tags: ["AI/ML", "Algorithms", "Research"],
    isUpvoted: true,
  },
  {
    id: "2",
    author: { name: "Alex Chen", avatar: "/placeholder.svg?height=40&width=40" },
    content: "Sharing my latest research on transformer architectures. The paper will be published next month!",
    timestamp: "1d ago",
    upvotes: 67,
    commentCount: 15,
    tags: ["AI/ML", "Research", "Transformers"],
  },
]

export default function ProfilePage({ params }: { params: { username: string } }) {
  const isOwnProfile = params.username === "you" // Mock check for current user

  return (
    // MODIFICATION: Changed bg-background to bg-transparent
    <div className="min-h-screen bg-transparent">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          {/* MODIFICATION: Applied glass effect to card */}
          <Card className="nexus-card bg-card/80 backdrop-blur-md border-border/50 p-8 mb-8">
            <div className="flex flex-col md:flex-row items-center text-center md:text-left md:items-start space-y-6 md:space-y-0 md:space-x-8">
              <Avatar className="h-32 w-32 ring-4 ring-primary/30">
                <AvatarImage src={mockUser.avatar || "/placeholder.svg"} alt={mockUser.name} />
                <AvatarFallback className="bg-muted text-4xl">{mockUser.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-center md:justify-between mb-4">
                  <div>
                    {/* MODIFICATION: Applied gradient to name */}
                    <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      {mockUser.name}
                    </h1>
                    <p className="text-muted-foreground">@{mockUser.username}</p>
                  </div>
                  {isOwnProfile && (
                    <Button variant="outline" className="mt-4 sm:mt-0 bg-transparent">
                      Edit Profile
                    </Button>
                  )}
                </div>

                <p className="text-foreground mb-4 leading-relaxed max-w-prose">{mockUser.bio}</p>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center space-x-1.5">
                    <MapPin className="h-4 w-4" />
                    <span>{mockUser.location}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {mockUser.joinDate}</span>
                  </div>
                </div>

                {/* Social Links */}
                <div className="flex items-center justify-center md:justify-start space-x-4">
                  <a href={`https://github.com/${mockUser.socials.github}`} className="text-muted-foreground hover:text-primary transition-colors"><Github className="h-5 w-5" /></a>
                  <a href={`https://twitter.com/${mockUser.socials.twitter}`} className="text-muted-foreground hover:text-primary transition-colors"><Twitter className="h-5 w-5" /></a>
                  <a href={`https://linkedin.com/in/${mockUser.socials.linkedin}`} className="text-muted-foreground hover:text-primary transition-colors"><Linkedin className="h-5 w-5" /></a>
                  <a href={`https://${mockUser.socials.website}`} className="text-muted-foreground hover:text-primary transition-colors"><Globe className="h-5 w-5" /></a>
                </div>
              </div>
            </div>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <UserStatsCard label="Nodes" value={mockUser.stats.nodes} icon={<Nodes className="h-5 w-5" />} />
            <UserStatsCard label="Reputation" value={mockUser.stats.reputation} icon={<Trophy className="h-5 w-5" />} />
            <UserStatsCard label="Posts" value={mockUser.stats.posts} icon={<MessageSquare className="h-5 w-5" />} />
            <UserStatsCard label="Upvotes" value={mockUser.stats.upvotes} icon={<ThumbsUp className="h-5 w-5" />} />
          </div>

          {/* Interests */}
          <Card className="nexus-card bg-card/80 backdrop-blur-md border-border/50 p-6 mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-4">Interests</h3>
            <div className="flex flex-wrap gap-2">
              {mockUser.interests.map((interest) => (
                <Badge key={interest} variant="secondary" className="nexus-tag">{interest}</Badge>
              ))}
            </div>
          </Card>

          {/* Posts */}
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="upvoted">Upvoted</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="space-y-6 mt-8">
              {mockUserPosts.map((post) => (<PostCard key={post.id} {...post} />))}
            </TabsContent>

            <TabsContent value="upvoted" className="mt-8">
              <Card className="nexus-card bg-card/80 backdrop-blur-md border-border/50 text-center py-12">
                <p className="text-muted-foreground">No upvoted posts to show</p>
              </Card>
            </TabsContent>

            <TabsContent value="comments" className="mt-8">
              <Card className="nexus-card bg-card/80 backdrop-blur-md border-border/50 text-center py-12">
                <p className="text-muted-foreground">No comments to show</p>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}