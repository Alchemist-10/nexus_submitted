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
    postTypes?: string[]
    batches?: string[]
    semesters?: string[]
  }) => void
  onRefresh?: () => void
}

const sortOptions = [
  { id: "newest", value: "created_at", label: "Newest First", order: "desc" },
  { id: "oldest", value: "created_at", label: "Oldest First", order: "asc" },
  { id: "most_liked", value: "upvotes", label: "Most Liked", order: "desc" },
  { id: "most_commented", value: "comment_count", label: "Most Commented", order: "desc" },
  { id: "trending", value: "upvotes", label: "Trending", order: "desc" },
  { id: "alphabetical", value: "title", label: "Alphabetical", order: "asc" },
]


function FeedControlsComponent({ onFiltersChange, onRefresh }: FeedControlsProps) {
  const [showHiddenPosts, setShowHiddenPosts] = useState(false)
  const [activeFilters, setActiveFilters] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("created_at")
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>("desc")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedPostTypes, setSelectedPostTypes] = useState<string[]>([])

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query)
      onFiltersChange?.({
        search: query,
        sortBy,
        order: sortOrder,
        tags: selectedTags,
        postTypes: selectedPostTypes,
      })
    },
    [onFiltersChange, sortBy, sortOrder, selectedTags, selectedPostTypes]
  )

 const handleSort = useCallback(
  (sortId: string) => {
    const option = sortOptions.find(opt => opt.id === sortId)
    if (option) {
      setSortBy(option.value)
      setSortOrder(option.order as 'asc' | 'desc')
      onFiltersChange?.({
        search: searchQuery,
        sortBy: option.value,
        order: option.order as 'asc' | 'desc',
        tags: selectedTags,
        postTypes: selectedPostTypes,
      })
    }
  },
  [onFiltersChange, searchQuery, selectedTags, selectedPostTypes]
)


  const handleToggleHiddenPosts = useCallback(() => {
    setShowHiddenPosts(!showHiddenPosts)
  }, [showHiddenPosts])

  const handleMarkAllRead = useCallback(() => {
    console.log("Marking all posts as read")
  }, [])

  const handleRefreshFeed = useCallback(() => {
    onRefresh?.()
  }, [onRefresh])

  const handleAdvancedFilters = useCallback(
    (filters: any) => {
      setActiveFilters(Object.values(filters).flat().length)
      setSelectedTags(filters.tags || [])
      setSelectedPostTypes(filters.postTypes || [])
      onFiltersChange?.({
        search: searchQuery,
        sortBy,
        order: sortOrder,
        ...filters,
      })
    },
    [onFiltersChange, searchQuery, sortBy, sortOrder]
  )

  const currentSortOption = useMemo(() => sortOptions.find((opt) => opt.value === sortBy), [sortBy])

  return (
    <div className="flex flex-col gap-4 mb-6 p-3 sm:p-4 bg-card/50 backdrop-blur-md rounded-xl border border-border/50 nexus-slide-in">
      <div className="grid grid-cols-2 md:flex md:flex-wrap items-center gap-2">
        <AdvancedFilterModal onFiltersChange={handleAdvancedFilters} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="bg-transparent w-full">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              {currentSortOption?.label || "Sort by"}
              <ChevronDown className="h-4 w-4 ml-auto" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width]">
           {sortOptions.map((option) => (
  <DropdownMenuItem key={option.id} onClick={() => handleSort(option.id)}>
    {option.label}
  </DropdownMenuItem>
))}

          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="bg-transparent w-full">
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

      <div className="flex flex-wrap items-center justify-start gap-2">
        {activeFilters > 0 && (
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {activeFilters} active filter{activeFilters > 1 ? "s" : ""}
          </Badge>
        )}
      </div>
    </div>
  )
}

export const FeedControls = withErrorBoundary(FeedControlsComponent)
