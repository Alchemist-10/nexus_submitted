"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, ArrowUp, Clock } from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/api";

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [activeTab, setActiveTab] = useState("all");
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // --- Fetch results when query changes ---
  useEffect(() => {
    async function fetchResults() {
      if (!query) return;
      try {
        setIsLoading(true);
        const data = await apiClient.search({ q: query });
        setResults(data);
      } catch (err) {
        console.error("Search failed:", err);
        setResults({ posts: [], users: [] });
      } finally {
        setIsLoading(false);
      }
    }
    fetchResults();
  }, [query]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Search Results</h1>
          <p className="text-muted-foreground">
            {query
              ? `Results for "${query}"`
              : "Enter a search term to find posts, users, and tags"}
          </p>
        </div>

        {!query ? (
          <p className="text-muted-foreground">Start typing in the search bar above.</p>
        ) : isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (
          results && (
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3 max-w-md">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="posts">Posts</TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
              </TabsList>

              {/* --- ALL TAB --- */}
              <TabsContent value="all" className="space-y-6 mt-6">
                {results.posts?.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold mb-4">Posts</h2>
                    <div className="space-y-4">
                      {results.posts.map((post: any) => (
                        <PostCard key={post.id} post={post} />
                      ))}
                    </div>
                  </div>
                )}

                {results.users?.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold mb-4">Users</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                      {results.users.map((user: any) => (
                        <UserCard key={user.username} user={user} />
                      ))}
                    </div>
                  </div>
                )}

                {(!results.posts?.length && !results.users?.length) && (
                  <p className="text-muted-foreground">
                    No results found for “{query}”
                  </p>
                )}
              </TabsContent>

              {/* --- POSTS TAB --- */}
              <TabsContent value="posts" className="mt-6">
                {results.posts?.length ? (
                  <div className="space-y-4">
                    {results.posts.map((post: any) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No posts found.</p>
                )}
              </TabsContent>

              {/* --- USERS TAB --- */}
              <TabsContent value="users" className="mt-6">
                {results.users?.length ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {results.users.map((user: any) => (
                      <UserCard key={user.username} user={user} />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No users found.</p>
                )}
              </TabsContent>
            </Tabs>
          )
        )}
      </div>
    </div>
  );
}

// --- Reusable Post Card ---
function PostCard({ post }: { post: any }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <Link href={`/post/${post.id}`} className="flex-1">
            <h3 className="font-semibold text-lg hover:text-primary transition-colors">
              {post.title}
            </h3>
          </Link>
        </div>

        <p className="text-muted-foreground mb-4 line-clamp-2">
          {post.content}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <Link
              href={`/profile/${post.username}`}
              className="hover:text-primary transition-colors"
            >
              by {post.author}
            </Link>
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{post.timeAgo}</span>
            </div>
            <div className="flex items-center space-x-1">
              <ArrowUp className="h-3 w-3" />
              <span>{post.upvotes}</span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageSquare className="h-3 w-3" />
              <span>{post.comments}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {post.tags?.map((tag: string) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Reusable User Card ---
function UserCard({ user }: { user: any }) {
  return (
    <Card>
      <CardContent className="p-4">
        <Link href={`/profile/${user.username}`} className="block">
          <div className="flex items-center space-x-3 mb-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback>
                {user.name
                  ?.split(" ")
                  .map((n: string) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold hover:text-primary transition-colors">
                {user.name}
              </h3>
              <p className="text-sm text-muted-foreground">@{user.username}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-3">{user.bio}</p>
          <div className="flex items-center space-x-4 text-sm">
            <span>
              <strong>{user.reputation}</strong> reputation
            </span>
            <span>
              <strong>{user.nodes}</strong> nodes
            </span>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchResults />
    </Suspense>
  );
}
