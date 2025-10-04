    "use client"

    import { useState, useEffect, useCallback } from "react" // 1. Import useCallback
    import { Navigation } from "@/components/navigation"
    import { FloatingActionButton } from "@/components/floating-action-button"
    import { EnhancedPostCard } from "@/components/enhanced-post-card"
    import { FeedViewSwitcher } from "@/components/feed-view-switcher"
    import { FeedControls } from "@/components/feed-controls"
    import { ErrorBoundary } from "@/components/error-boundary"
    import { apiClient } from '@/lib/api'
    import { useRealtimePosts } from '@/lib/hooks/useRealtime'

    export default function HomePage() {
        const [activeView, setActiveView] = useState<any>("timeline")
        const { posts, setPosts } = useRealtimePosts()

        // 2. Create a memoized function to fetch posts.
        // This can now be safely passed to child components.
        const refetchPosts = useCallback(async () => {
            try {
                const { data } = await apiClient.getPosts({
                    page: 1,
                    limit: 10,
                    sortBy: "created_at",
                    order: "desc",
                    feed: activeView
                })
                setPosts(data) // push into realtime state
            } catch (err) {
                console.error("Failed to load posts:", err)
            }
        }, [setPosts, activeView])

        // 3. Call the refetch function on initial component mount.
        useEffect(() => {
            refetchPosts()
        }, [refetchPosts])

        return (
            // MODIFICATION: Changed bg-background to bg-transparent
            <div className="min-h-screen bg-transparent transition-colors duration-300">
                <ErrorBoundary>
                    <Navigation />
                </ErrorBoundary>

                <main className="w-full max-w-4xl mx-auto px-4 lg:px-0 py-6 sm:py-8">
                    <div className="w-full mx-auto space-y-6">
                        <div className="nexus-slide-in">
                            <ErrorBoundary>
                                <FeedViewSwitcher activeView={activeView} onViewChange={(v: any) => setActiveView(v)} />
                            </ErrorBoundary>
                        </div>

                        <div className="space-y-4 nexus-slide-in" style={{ animationDelay: "100ms" }}>
                            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent transition-all duration-300">
                                {activeView === "timeline" && "Timeline"}
                                {activeView === "merged" && "Merged Discussions"}
                                {activeView === "engaged" && "Your Engagements"}
                                {activeView === "relevance" && "Most Relevant"}
                            </h1>
                            <FeedControls />
                        </div>

                        <ErrorBoundary>
                            <div className="space-y-6">
                                {posts?.map((post, index) => (
                                    <div key={post.id} className="nexus-slide-in" style={{ animationDelay: `${200 + index * 100}ms` }}>
                                        <ErrorBoundary>
                                            <EnhancedPostCard
                                                {...(post as any)}
                                            />
                                        </ErrorBoundary>
                                    </div>
                                ))}
                            </div>
                        </ErrorBoundary>
                    </div>
                </main>

                <ErrorBoundary>
                    <FloatingActionButton />
                </ErrorBoundary>
            </div>
        )
    }