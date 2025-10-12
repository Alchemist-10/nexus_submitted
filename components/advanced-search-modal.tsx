// app/components/advanced-search-modal.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { Search, Hash, User, FileText, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { apiClient } from "@/lib/api";
import { SearchResult } from "@/lib/types";

interface AdvancedSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Suggestion = { type: "post" | "user" | "tag"; id: string; value: string };

export function AdvancedSearchModal({ open, onOpenChange }: AdvancedSearchModalProps) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Browser setTimeout returns number
  const searchDebounce = useRef<number | null>(null);
  const suggestionDebounce = useRef<number | null>(null);

  // --- Debounced Autocomplete for Suggestions ---
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (suggestionDebounce.current) window.clearTimeout(suggestionDebounce.current);

    suggestionDebounce.current = window.setTimeout(async () => {
      try {
        const data = await apiClient.autocomplete({ q: query });
        const raw = data?.suggestions || [];

        const normalized: Suggestion[] = raw.map((s: any) => {
          if (typeof s === "string") return { type: "tag", id: s, value: s };
          return {
            type: (s.type ?? "tag") as "post" | "user" | "tag",
            id: String(s.id ?? s.value ?? s),
            value: String(s.value ?? s.id ?? s),
          };
        });

        setSuggestions(normalized);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Autocomplete failed:", error);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 200);

    return () => {
      if (suggestionDebounce.current) window.clearTimeout(suggestionDebounce.current);
    };
  }, [query]);

  // --- Debounced Full Search for Results ---
  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    if (searchDebounce.current) window.clearTimeout(searchDebounce.current);

    searchDebounce.current = window.setTimeout(async () => {
      try {
        const data = await apiClient.search({ q: query, type: activeTab as any });
        setResults(data);
      } catch (error) {
        console.error("Search failed:", error);
        setResults({ posts: [], users: [], tags: [] });
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => {
      if (searchDebounce.current) window.clearTimeout(searchDebounce.current);
    };
  }, [query, activeTab]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-bold">Search Nexus</DialogTitle>
        </DialogHeader>

        <div className="px-6 flex flex-col flex-1 min-h-0">
          {/* Search Input with Autocomplete */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search for posts, users, tags..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              onBlur={() => {
                // small delay to allow click on suggestion
                window.setTimeout(() => setShowSuggestions(false), 180);
              }}
              className="pl-12 pr-12 h-12 text-lg bg-muted/30 border-0 focus:bg-background transition-colors"
              autoFocus
            />

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-card border rounded-md shadow-lg z-10 p-2 max-h-60 overflow-y-auto">
                {suggestions.map((suggestion) => (
                  <Link
                    key={`${suggestion.type}-${suggestion.id}`}
                    href={
                      suggestion.type === "post"
                        ? `/posts/${encodeURIComponent(suggestion.id)}`
                        : suggestion.type === "user"
                        ? `/profile/${encodeURIComponent(suggestion.id)}`
                        : `/tags/${encodeURIComponent(suggestion.id)}`
                    }
                    onClick={() => {
                      setQuery(suggestion.value);
                      setShowSuggestions(false);
                      onOpenChange(false);
                    }}
                    className="p-2 text-sm hover:bg-muted rounded-md flex items-center justify-between"
                  >
                    <div>
                      <span className="font-medium">{suggestion.value}</span>
                      <span className="text-xs text-muted-foreground ml-2">({suggestion.type})</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col flex-1 min-h-0">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-6">
              <TabsTrigger value="all">
                <Search className="h-4 w-4 mr-2" />
                All
              </TabsTrigger>
              <TabsTrigger value="posts">
                <FileText className="h-4 w-4 mr-2" />
                Posts
              </TabsTrigger>
              <TabsTrigger value="users">
                <User className="h-4 w-4 mr-2" />
                Users
              </TabsTrigger>
              <TabsTrigger value="tags">
                <Hash className="h-4 w-4 mr-2" />
                Tags
              </TabsTrigger>
            </TabsList>

            <div className="overflow-y-auto flex-1">
              {isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : !results || (!results.posts?.length && !results.users?.length && !results.tags?.length) ? (
                <div className="text-center py-12 text-muted-foreground">
                  {query.length < 2 ? (
                    <>
                      <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Start typing to search across Nexus</p>
                    </>
                  ) : (
                    <p>No results found for "{query}"</p>
                  )}
                </div>
              ) : (
                <>
                  <TabsContent value="all" className="space-y-6 mt-0">
                    <ResultsList results={results} onOpenChange={onOpenChange} />
                  </TabsContent>

                  <TabsContent value="posts" className="space-y-3 mt-0">
                    {results.posts.map((post) => (
                      <PostResult key={post.id} post={post} onOpenChange={onOpenChange} />
                    ))}
                  </TabsContent>

                  <TabsContent value="users" className="space-y-3 mt-0">
                    {results.users.map((user) => (
                      <UserResult key={user.id} user={user} onOpenChange={onOpenChange} />
                    ))}
                  </TabsContent>

                  <TabsContent value="tags" className="space-y-3 mt-0">
                    {results.tags.map((tag) => (
                      <TagResult key={tag.id} tag={tag} onOpenChange={onOpenChange} />
                    ))}
                  </TabsContent>
                </>
              )}
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Reusable Helper Components ---
const ResultsList = ({ results, onOpenChange }: { results: SearchResult; onOpenChange: (open: boolean) => void }) => {
  return (
    <>
      {results.posts?.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3 flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Posts
          </h3>
          <div className="space-y-3">
            {results.posts.slice(0, 3).map((post) => (
              <PostResult key={post.id} post={post} onOpenChange={onOpenChange} />
            ))}
          </div>
        </div>
      )}

      {results.users?.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3 flex items-center">
            <User className="h-4 w-4 mr-2" />
            Users
          </h3>
          <div className="space-y-3">
            {results.users.slice(0, 3).map((user) => (
              <UserResult key={user.id} user={user} onOpenChange={onOpenChange} />
            ))}
          </div>
        </div>
      )}

      {results.tags?.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3 flex items-center">
            <Hash className="h-4 w-4 mr-2" />
            Tags
          </h3>
          <div className="space-y-3">
            {results.tags.slice(0, 3).map((tag) => (
              <TagResult key={tag.id} tag={tag} onOpenChange={onOpenChange} />
            ))}
          </div>
        </div>
      )}
    </>
  );
};

const PostResult = ({ post, onOpenChange }: { post: any; onOpenChange: (open: boolean) => void }) => (
  <Card className="p-4 hover:bg-muted/50 transition-colors">
    <Link href={`/posts/${encodeURIComponent(post.id)}`} onClick={() => onOpenChange(false)}>
      <h4 className="font-medium mb-1">{post.title}</h4>
      <p className="text-sm text-muted-foreground line-clamp-2">{post.content}</p>
    </Link>
  </Card>
);

const UserResult = ({ user, onOpenChange }: { user: any; onOpenChange: (open: boolean) => void }) => (
  <Card className="p-4 hover:bg-muted/50 transition-colors">
    <Link href={`/profile/${encodeURIComponent(user.username)}`} onClick={() => onOpenChange(false)} className="flex items-center space-x-3">
      <Avatar className="h-10 w-10">
        <AvatarImage src={user.avatar_url} />
        <AvatarFallback>{user.full_name?.split(" ").map((n: string) => n[0]).join("")}</AvatarFallback>
      </Avatar>
      <div>
        <h4 className="font-medium">{user.full_name}</h4>
        <p className="text-sm text-muted-foreground">@{user.username}</p>
      </div>
    </Link>
  </Card>
);

const TagResult = ({ tag, onOpenChange }: { tag: any; onOpenChange: (open: boolean) => void }) => (
  <Link href={`/tags/${encodeURIComponent(tag.name)}`} onClick={() => onOpenChange(false)}>
    <Card className="p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium flex items-center">
            <Hash className="h-4 w-4 mr-1" />
            {tag.name}
          </h4>
          <p className="text-sm text-muted-foreground">{tag.description}</p>
        </div>
        <Badge variant="outline">{tag.post_count} posts</Badge>
      </div>
    </Card>
  </Link>
);

export default AdvancedSearchModal;
