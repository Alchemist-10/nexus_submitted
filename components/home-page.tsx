"use client"

import { useState, useCallback, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { FloatingActionButton } from "@/components/floating-action-button"
import { EnhancedPostCard } from "@/components/enhanced-post-card"
import { FeedViewSwitcher } from "@/components/feed-view-switcher"
import { FeedControls } from "@/components/feed-controls"
import { ErrorBoundary } from "@/components/error-boundary"
import { apiClient } from "@/lib/api"
import { useRealtimePosts } from "@/lib/hooks/useRealtime"
import { Post } from "@/lib/types"


type Filters = {
  search?: string
  sortBy?: string
  order?: "asc" | "desc"
  postTypes?: string[]
  tags?: string[]
  batches?: string[]
  semesters?: string[]
}

export default function HomePage() {
  const [activeView, setActiveView] = useState<"timeline" | "merged" | "engaged" | "relevance">("timeline")
  const { posts, setPosts } = useRealtimePosts()
  const [filters, setFilters] = useState<Filters>({})
  const [isLoading, setIsLoading] = useState(true)

  const refetchPosts = useCallback(
    async (currentFilters: Filters = {}) => {
      setIsLoading(true)
      try {
        const { data } = await apiClient.getPosts({
          feed: activeView,
          sortBy: currentFilters.sortBy || "created_at",
          order: currentFilters.order || "desc",
          ...currentFilters,
        })
        setPosts(data as Post[])
      } catch (err) {
        console.error("Failed to load posts:", err)
      } finally {
        setIsLoading(false)
      }
    },
    [setPosts, activeView]
  )

  // Initial + when filters or view change
  useEffect(() => {
    refetchPosts(filters)
  }, [filters, refetchPosts, activeView])

  // Called by FeedControls (includes AdvancedFilterModal + sorting + search)
  const handleFiltersChange = useCallback((newFilters: Filters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }, [])

  return (
    <div className="min-h-screen bg-transparent">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Feed view tabs */}
          <FeedViewSwitcher activeView={activeView} onViewChange={setActiveView} />

          {/* Feed Controls (includes AdvancedFilterModal internally) */}
          <FeedControls onFiltersChange={handleFiltersChange} onRefresh={() => refetchPosts(filters)} />

          <ErrorBoundary>
            {isLoading ? (
              <p className="text-center text-muted-foreground">Loading posts...</p>
            ) : (
              <div className="space-y-6">
                {posts?.map((post, index) => (
                  <div
                    key={post.id}
                    className="nexus-slide-in"
                    style={{ animationDelay: `${100 + index * 50}ms` }}
                  >
                    <ErrorBoundary>
                      <EnhancedPostCard {...(post as any)} onVoteSuccess={() => refetchPosts(filters)}
                        />
                    </ErrorBoundary>
                  </div>
                ))}
              </div>
            )}
          </ErrorBoundary>
        </div>
      </main>

      <FloatingActionButton />
    </div>
  )
}
