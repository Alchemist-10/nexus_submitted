"use client"

import { useState } from "react"
import { Search, X, Hash, User, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import Link from "next/link"

interface AdvancedSearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Mock search data
const mockSearchResults = {
  posts: [
    { id: "1", title: "Getting Started with Machine Learning", author: "Alex Chen", excerpt: "A comprehensive guide to ML fundamentals...", tags: ["AI/ML", "Python"] },
    { id: "2", title: "React Best Practices for 2024", author: "Sarah Kim", excerpt: "Modern React patterns and techniques...", tags: ["React", "JavaScript"] },
    { id: "3", title: "Database Optimization Techniques", author: "Mike Johnson", excerpt: "Advanced SQL optimization strategies...", tags: ["Database", "SQL"] },
  ],
  users: [
    { username: "alexchen", name: "Alex Chen", reputation: 2847, bio: "ML Engineer & Researcher" },
    { username: "sarahkim", name: "Sarah Kim", reputation: 2156, bio: "Full-stack Developer" },
    { username: "mikejohnson", name: "Mike Johnson", reputation: 1923, bio: "Database Architect" },
  ],
  tags: [
    { name: "AI/ML", count: 156, description: "Artificial Intelligence & Machine Learning" },
    { name: "React", count: 234, description: "React.js framework and ecosystem" },
    { name: "Python", count: 189, description: "Python programming language" },
    { name: "Database", count: 145, description: "Database design and optimization" },
  ],
}

export function AdvancedSearchModal({ open, onOpenChange }: AdvancedSearchModalProps) {
  const [query, setQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery)
    // Implement real-time search logic here
  }

  const filteredResults = {
    posts: mockSearchResults.posts.filter(
      (post) =>
        post.title.toLowerCase().includes(query.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(query.toLowerCase()),
    ),
    users: mockSearchResults.users.filter(
      (user) =>
        user.name.toLowerCase().includes(query.toLowerCase()) || user.bio.toLowerCase().includes(query.toLowerCase()),
    ),
    tags: mockSearchResults.tags.filter(
      (tag) =>
        tag.name.toLowerCase().includes(query.toLowerCase()) ||
        tag.description.toLowerCase().includes(query.toLowerCase()),
    ),
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-bold">Search Nexus</DialogTitle>
        </DialogHeader>

        <div className="px-6 flex flex-col flex-1 min-h-0">
          {/* Search Input */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search for posts, users, tags..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-12 pr-12 h-12 text-lg bg-muted/30 border-0 focus:bg-background transition-colors"
              autoFocus
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Search Scope Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col flex-1 min-h-0">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-6">
              <TabsTrigger value="all"><Search className="h-4 w-4 mr-2" />All</TabsTrigger>
              <TabsTrigger value="posts"><FileText className="h-4 w-4 mr-2" />Posts</TabsTrigger>
              <TabsTrigger value="users"><User className="h-4 w-4 mr-2" />Users</TabsTrigger>
              <TabsTrigger value="tags"><Hash className="h-4 w-4 mr-2" />Tags</TabsTrigger>
            </TabsList>

            <div className="overflow-y-auto flex-1">
              <TabsContent value="all" className="space-y-6 mt-0">
                {/* All Results */}
                {query ? (
                  <>
                    {filteredResults.posts.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center"><FileText className="h-4 w-4 mr-2" />Posts ({filteredResults.posts.length})</h3>
                        <div className="space-y-3">
                          {filteredResults.posts.slice(0, 3).map((post) => (
                            <Card key={post.id} className="p-4 hover:bg-muted/50 transition-colors">
                              <Link href={`/post/${post.id}`} onClick={() => onOpenChange(false)}>
                                <h4 className="font-medium mb-1">{post.title}</h4>
                                <p className="text-sm text-muted-foreground mb-2">{post.excerpt}</p>
                                <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">by {post.author}</span>
                                  <div className="flex gap-1">{post.tags.map((tag) => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}</div>
                                </div>
                              </Link>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {filteredResults.users.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center"><User className="h-4 w-4 mr-2" />Users ({filteredResults.users.length})</h3>
                        <div className="space-y-3">
                          {filteredResults.users.slice(0, 3).map((user) => (
                            <Card key={user.username} className="p-4 hover:bg-muted/50 transition-colors">
                              <Link href={`/profile/${user.username}`} onClick={() => onOpenChange(false)} className="flex items-center space-x-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback>{user.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <h4 className="font-medium">{user.name}</h4>
                                  <p className="text-sm text-muted-foreground">{user.bio}</p>
                                  <p className="text-xs text-primary">{user.reputation} reputation</p>
                                </div>
                              </Link>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Start typing to search across Nexus</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="posts" className="space-y-3 mt-0">
                {filteredResults.posts.map((post) => (
                  <Card key={post.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <Link href={`/post/${post.id}`} onClick={() => onOpenChange(false)}>
                      <h4 className="font-medium mb-1">{post.title}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{post.excerpt}</p>
                      <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">by {post.author}</span>
                        <div className="flex gap-1">{post.tags.map((tag) => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}</div>
                      </div>
                    </Link>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="users" className="space-y-3 mt-0">
                {filteredResults.users.map((user) => (
                  <Card key={user.username} className="p-4 hover:bg-muted/50 transition-colors">
                    <Link href={`/profile/${user.username}`} onClick={() => onOpenChange(false)} className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10"><AvatarFallback>{user.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback></Avatar>
                      <div className="flex-1">
                        <h4 className="font-medium">{user.name}</h4>
                        <p className="text-sm text-muted-foreground">{user.bio}</p>
                        <p className="text-xs text-primary">{user.reputation} reputation</p>
                      </div>
                    </Link>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="tags" className="space-y-3 mt-0">
                {filteredResults.tags.map((tag) => (
                  <Card key={tag.name} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium flex items-center"><Hash className="h-4 w-4 mr-1" />{tag.name}</h4>
                        <p className="text-sm text-muted-foreground">{tag.description}</p>
                      </div>
                      <Badge variant="outline">{tag.count} posts</Badge>
                    </div>
                  </Card>
                ))}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}