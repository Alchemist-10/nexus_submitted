"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import Link from "next/link"

// Mock data for search results
const mockSearchData = {
  posts: [
    { id: "1", title: "Getting Started with Machine Learning", author: "Alex Chen" },
    { id: "2", title: "React Best Practices for 2024", author: "Sarah Kim" },
    { id: "3", title: "Database Optimization Techniques", author: "Mike Johnson" },
  ],
  tags: ["AI/ML", "React", "Database", "Python", "JavaScript"],
  users: [
    { username: "alex-chen", name: "Alex Chen", reputation: 1250 },
    { username: "sarah-kim", name: "Sarah Kim", reputation: 980 },
    { username: "mike-johnson", name: "Mike Johnson", reputation: 756 },
  ],
}

export function SearchBar() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [query, setQuery] = useState("")
  const [showResults, setShowResults] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false)
        setShowResults(false)
        setQuery("")
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSearchClick = () => {
    setIsExpanded(true)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleInputChange = (value: string) => {
    setQuery(value)
    setShowResults(value.length > 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim()) {
      // Navigate to search results page
      window.location.href = `/search?q=${encodeURIComponent(query)}`
    }
  }

  const filteredResults = {
    posts: mockSearchData.posts.filter((post) => post.title.toLowerCase().includes(query.toLowerCase())).slice(0, 3),
    tags: mockSearchData.tags.filter((tag) => tag.toLowerCase().includes(query.toLowerCase())).slice(0, 5),
    users: mockSearchData.users.filter((user) => user.name.toLowerCase().includes(query.toLowerCase())).slice(0, 3),
  }

  return (
    <div ref={containerRef} className="relative">
      {!isExpanded ? (
        <Button variant="ghost" size="sm" onClick={handleSearchClick} className="h-9 w-9 p-0">
          <Search className="h-4 w-4" />
        </Button>
      ) : (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="search"
              placeholder="Search Nexus..."
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-64 pl-10 pr-10"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsExpanded(false)
                setShowResults(false)
                setQuery("")
              }}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* Live Search Results Dropdown */}
          {showResults && (
            <Card className="absolute top-full mt-2 w-full max-w-md z-50 p-4 shadow-lg">
              {filteredResults.posts.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Posts</h4>
                  <div className="space-y-2">
                    {filteredResults.posts.map((post) => (
                      <Link
                        key={post.id}
                        href={`/post/${post.id}`}
                        className="block p-2 rounded-md hover:bg-muted transition-colors"
                      >
                        <div className="font-medium text-sm">{post.title}</div>
                        <div className="text-xs text-muted-foreground">by {post.author}</div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {filteredResults.tags.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {filteredResults.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {filteredResults.users.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Users</h4>
                  <div className="space-y-2">
                    {filteredResults.users.map((user) => (
                      <Link
                        key={user.username}
                        href={`/profile/${user.username}`}
                        className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted transition-colors"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.reputation} rep</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {query &&
                filteredResults.posts.length === 0 &&
                filteredResults.tags.length === 0 &&
                filteredResults.users.length === 0 && (
                  <div className="text-center text-muted-foreground text-sm py-4">No results found for "{query}"</div>
                )}

              {query && (
                <div className="mt-4 pt-3 border-t">
                  <Link
                    href={`/search?q=${encodeURIComponent(query)}`}
                    className="text-sm text-primary hover:underline"
                  >
                    View all results for "{query}"
                  </Link>
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
