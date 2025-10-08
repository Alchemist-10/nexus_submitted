"use client"

import { useState } from "react"
import { Filter, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

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
  "CP",
  "Algorithms",
  "Research",
]
const batches = ["2025", "2026", "2027", "2028"]
const semesters = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"]

interface FilterState {
  types: string[]
  tags: string[]
  batches: string[]
  semesters: string[]
}

interface AdvancedFilterModalProps {
  onFiltersChange: (filters: {
    postTypes?: string[]
    tags?: string[]
    batches?: string[]
    semesters?: string[]
  }) => void
}


export function AdvancedFilterModal({ onFiltersChange }: AdvancedFilterModalProps) {
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
    onFiltersChange({})
  }

  const applyFilters = () => {
    const selectedTags = filters.tags.length > 0 ? filters.tags : undefined
    const selectedPostType = filters.types.length > 0 ? filters.types[0] : undefined

  onFiltersChange({
  postTypes: filters.types.length > 0 ? filters.types : undefined,
  tags: filters.tags.length > 0 ? filters.tags : undefined,
  batches: filters.batches.length > 0 ? filters.batches : undefined,
  semesters: filters.semesters.length > 0 ? filters.semesters : undefined,
})


    console.log("[v0] Applying filters:", { tags: selectedTags, postType: selectedPostType })
    setIsOpen(false)
  }

  const activeFilterCount = Object.values(filters).flat().length

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="relative bg-transparent nexus-hover-lift">
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-primary/20 text-primary"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md md:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <Filter className="h-5 w-5 mr-2 text-primary" />
            Filter Posts
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-grow pr-4 -mr-4">
          <Accordion type="multiple" defaultValue={["types", "tags"]} className="w-full">
            {/* Filter by Type */}
            <AccordionItem value="types">
              <AccordionTrigger className="text-sm font-semibold">
                Filter by Type
                {filters.types.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {filters.types.length}
                  </Badge>
                )}
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {postTypes.map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={`type-${type}`}
                        checked={filters.types.includes(type)}
                        onCheckedChange={() => toggleFilter("types", type)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <Label
                        htmlFor={`type-${type}`}
                        className="text-sm cursor-pointer hover:text-primary transition-colors"
                      >
                        {type}
                      </Label>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Filter by Tag */}
            <AccordionItem value="tags">
              <AccordionTrigger className="text-sm font-semibold">
                Filter by Tag
                {filters.tags.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {filters.tags.length}
                  </Badge>
                )}
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search for a tag..."
                      value={tagSearch}
                      onChange={(e) => setTagSearch(e.target.value)}
                      className="pl-10 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <ScrollArea className="h-40 w-full rounded-md border border-border/50 p-3">
                    <div className="space-y-2">
                      {filteredTags.map((tag) => (
                        <div key={tag} className="flex items-center space-x-2">
                          <Checkbox
                            id={`tag-${tag}`}
                            checked={filters.tags.includes(tag)}
                            onCheckedChange={() => toggleFilter("tags", tag)}
                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <Label
                            htmlFor={`tag-${tag}`}
                            className="text-sm cursor-pointer hover:text-primary transition-colors"
                          >
                            #{tag}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Filter by Batch */}
            <AccordionItem value="batches">
              <AccordionTrigger className="text-sm font-semibold">
                Filter by Batch
                {filters.batches.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {filters.batches.length}
                  </Badge>
                )}
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {batches.map((batch) => (
                    <div key={batch} className="flex items-center space-x-2">
                      <Checkbox
                        id={`batch-${batch}`}
                        checked={filters.batches.includes(batch)}
                        onCheckedChange={() => toggleFilter("batches", batch)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <Label
                        htmlFor={`batch-${batch}`}
                        className="text-sm cursor-pointer hover:text-primary transition-colors"
                      >
                        Class of {batch}
                      </Label>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Filter by Semester */}
            <AccordionItem value="semesters">
              <AccordionTrigger className="text-sm font-semibold">
                Filter by Semester
                {filters.semesters.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {filters.semesters.length}
                  </Badge>
                )}
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                  {semesters.map((semester) => (
                    <div key={semester} className="flex items-center space-x-2">
                      <Checkbox
                        id={`semester-${semester}`}
                        checked={filters.semesters.includes(semester)}
                        onCheckedChange={() => toggleFilter("semesters", semester)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <Label
                        htmlFor={`semester-${semester}`}
                        className="text-sm cursor-pointer hover:text-primary transition-colors"
                      >
                        {semester}
                      </Label>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 mt-4 border-t border-border/50">
          <Button
            variant="outline"
            onClick={clearAllFilters}
            className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 bg-transparent"
          >
            Clear All
          </Button>
          <Button onClick={applyFilters} className="bg-primary hover:bg-primary/90 nexus-glow">
            Apply Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2 bg-primary-foreground/20 text-primary-foreground">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}