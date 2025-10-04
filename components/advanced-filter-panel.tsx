"use client"

import { useState } from "react"
import { Filter, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

const postTypes = ["Project", "Academic", "Misc", "Guidance", "Announcement", "Question"]
const availableTags = [
  "AI/ML",
  "Python",
  "JavaScript",
  "React",
  "Node.js",
  "Database",
  "Web Development",
  "Mobile",
  "DevOps",
  "Security",
  "UI/UX",
  "Data Science",
  "Machine Learning",
  "Blockchain",
  "Cloud",
  "Music",
]
const batches = ["2025", "2026", "2027", "2028"]
const semesters = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"]

interface FilterState {
  types: string[]
  tags: string[]
  batches: string[]
  semesters: string[]
}

export function AdvancedFilterPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [tagSearch, setTagSearch] = useState("")
  const [filters, setFilters] = useState<FilterState>({
    types: [],
    tags: [],
    batches: [],
    semesters: [],
  })

  const filteredTags = availableTags.filter((tag) => tag.toLowerCase().includes(tagSearch.toLowerCase()))

  const toggleFilter = (category: keyof FilterState, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter((item) => item !== value)
        : [...prev[category], value],
    }))
  }

  const clearAllFilters = () => {
    setFilters({ types: [], tags: [], batches: [], semesters: [] })
    setTagSearch("")
  }

  const applyFilters = () => {
    console.log("[v0] Applying filters:", filters)
    setIsOpen(false)
  }

  const activeFilterCount = Object.values(filters).flat().length

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative bg-transparent">
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Advanced Filters
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Post Types */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Filter by Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {postTypes.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`type-${type}`}
                    checked={filters.types.includes(type)}
                    onCheckedChange={() => toggleFilter("types", type)}
                  />
                  <Label htmlFor={`type-${type}`} className="text-sm cursor-pointer">
                    {type}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Tags */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Filter by Tag</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for a tag..."
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <ScrollArea className="h-32 w-full rounded-md border p-2">
              <div className="space-y-2">
                {filteredTags.map((tag) => (
                  <div key={tag} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tag-${tag}`}
                      checked={filters.tags.includes(tag)}
                      onCheckedChange={() => toggleFilter("tags", tag)}
                    />
                    <Label htmlFor={`tag-${tag}`} className="text-sm cursor-pointer">
                      {tag}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <Separator />

          {/* Batch */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Filter by Batch</Label>
            <div className="grid grid-cols-2 gap-2">
              {batches.map((batch) => (
                <div key={batch} className="flex items-center space-x-2">
                  <Checkbox
                    id={`batch-${batch}`}
                    checked={filters.batches.includes(batch)}
                    onCheckedChange={() => toggleFilter("batches", batch)}
                  />
                  <Label htmlFor={`batch-${batch}`} className="text-sm cursor-pointer">
                    Class of {batch}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Semester */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Filter by Semester</Label>
            <div className="grid grid-cols-4 gap-2">
              {semesters.map((semester) => (
                <div key={semester} className="flex items-center space-x-2">
                  <Checkbox
                    id={`semester-${semester}`}
                    checked={filters.semesters.includes(semester)}
                    onCheckedChange={() => toggleFilter("semesters", semester)}
                  />
                  <Label htmlFor={`semester-${semester}`} className="text-sm cursor-pointer">
                    {semester}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between mt-8 pt-4 border-t">
          <Button variant="outline" onClick={clearAllFilters}>
            Clear All
          </Button>
          <Button onClick={applyFilters} className="bg-primary hover:bg-primary/90">
            Apply Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
