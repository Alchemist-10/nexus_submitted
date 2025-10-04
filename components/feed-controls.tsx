"use client"

import { useState, useCallback, useMemo } from "react"
import { Eye, EyeOff, Search, ArrowUpDown, ChevronDown, RefreshCw, CheckCheck, Settings } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { AdvancedFilterModal } from "@/components/advanced-filter-modal"
import { withErrorBoundary } from "@/components/error-boundary"

interface FeedControlsProps {
  onFiltersChange?: (filters: {
    search?: string
    sortBy?: string
    order?: 'asc' | 'desc'
    tags?: string[]
    postType?: string
  }) => void
  onRefresh?: () => void
}

const sortOptions = [
  { value: "created_at", label: "Newest First", order: "desc" },
  { value: "created_at", label: "Oldest First", order: "asc" },
  { value: "upvotes", label: "Most Liked", order: "desc" },
  { value: "comment_count", label: "Most Commented", order: "desc" },
  { value: "upvotes", label: "Trending", order: "desc" },
  { value: "title", label: "Alphabetical", order: "asc" },
]

function FeedControlsComponent({ onFiltersChange, onRefresh }: FeedControlsProps) {
  const [showHiddenPosts, setShowHiddenPosts] = useState(false)
  const [activeFilters, setActiveFilters] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("created_at")
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>("desc")
  const [selectedTag, setSelectedTag] = useState<string>("")
  const [selectedPostType, setSelectedPostType] = useState<string>("")

  const handleSearch = useCallback((query: string) => {
    try {
      setSearchQuery(query)
      onFiltersChange?.({
        search: query,
        sortBy,
        order: sortOrder,
        tag: selectedTag,
        postType: selectedPostType
      })
    } catch (error) {
      console.error("[v0] Error in search:", error)
    }
  }, [onFiltersChange, sortBy, sortOrder, selectedTag, selectedPostType])

  const handleSort = useCallback((sortValue: string) => {
    try {
      const option = sortOptions.find(opt => opt.value === sortValue)
      if (option) {
        setSortBy(option.value)
        setSortOrder(option.order as 'asc' | 'desc')
        onFiltersChange?.({
          search: searchQuery,
          sortBy: option.value,
          order: option.order as 'asc' | 'desc',
          tag: selectedTag,
          postType: selectedPostType
        })
      }
    } catch (error) {
      console.error("[v0] Error in sort:", error)
    }
  }, [onFiltersChange, searchQuery, selectedTag, selectedPostType])

  const handleToggleHiddenPosts = useCallback(() => {
    setShowHiddenPosts(!showHiddenPosts)
  }, [showHiddenPosts])

  const handleMarkAllRead = useCallback(() => {
    // This would typically mark all posts as read in your state management
    console.log("Marking all posts as read")
  }, [])

  const handleRefreshFeed = useCallback(() => {
    onRefresh?.()
  }, [onRefresh])

  const handleFeedSettings = useCallback(() => {
    // This would open feed settings modal
    console.log("Opening feed settings")
  }, [])

  const handleAdvancedFilters = useCallback((filters: any) => {
    setActiveFilters(Object.keys(filters).length)
    setSelectedTag(filters.tag || "")
    setSelectedPostType(filters.postType || "")
    onFiltersChange?.({
      search: searchQuery,
      sortBy,
      order: sortOrder,
      tag: filters.tag,
      postType: filters.postType
    })
  }, [onFiltersChange, searchQuery, sortBy, sortOrder])

  const currentSortOption = useMemo(() => sortOptions.find((opt) => opt.value === sortBy), [sortBy])

  return (
    <div className="flex flex-col gap-4 mb-6 p-3 sm:p-4 bg-card/50 backdrop-blur-md rounded-xl border border-border/50 nexus-slide-in">
      {/* MODIFICATION: Switched to a 2-column grid on mobile, and back to flex on medium screens */}
      <div className="grid grid-cols-2 md:flex md:flex-wrap items-center gap-2">
        <AdvancedFilterModal onFiltersChange={handleAdvancedFilters} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm" // MODIFICATION: Smaller button
              variant="outline"
              className="bg-transparent w-full"
            >
              <ArrowUpDown className="h-4 w-4 mr-2" />
              {currentSortOption?.label || "Sort by"}
              <ChevronDown className="h-4 w-4 ml-auto" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width]">
            {sortOptions.map((option) => (
              <DropdownMenuItem key={option.value} onClick={() => handleSort(option.value)}>
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm" // MODIFICATION: Smaller button
              variant="outline"
              className="bg-transparent w-full"
            >
              <Settings className="h-4 w-4 mr-2" />
              Actions
              <ChevronDown className="h-4 w-4 ml-auto" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width]">
            <DropdownMenuItem onClick={handleToggleHiddenPosts}>
              {showHiddenPosts ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showHiddenPosts ? "Hide Hidden" : "Show Hidden"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleMarkAllRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark All as Read
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleRefreshFeed}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Feed
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* MODIFICATION: Search bar now spans 2 columns in the mobile grid */}
        <div className="relative group col-span-2 w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Quick search..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 w-full bg-transparent border-border/50 focus:border-primary/50"
          />
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap items-center justify-start gap-2">
        {activeFilters > 0 && (
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {activeFilters} active filter{activeFilters > 1 ? "s" : ""}
          </Badge>
        )}
        {/* Other badges can go here */}
      </div>
    </div>
  )
}

export const FeedControls = withErrorBoundary(FeedControlsComponent)