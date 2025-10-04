"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, Search, Trophy, Target } from "lucide-react";
import AnimatedList from "./ui/animated-list";
import { LeaderboardRow } from "./leaderboard-row";
import { apiClient } from "@/lib/api";

type TimeRange = "week" | "month" | "all";

const availableTags = [
  "AI/ML", "Python", "JavaScript", "React", "Node.js", "Database",
  "Web Development", "Mobile", "DevOps", "Security", "UI/UX", "Data Science",
  "Machine Learning", "Blockchain", "Cloud", "Music",
];

export function EnhancedLeaderboardView() {
  // All state is now managed inside this component
  const [activeView, setActiveView] = useState<"global" | "specific">("global");
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tagSearch, setTagSearch] = useState("");
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);

  // Data fetching logic is now inside this component
  useEffect(() => {
    let isMounted = true;
    async function fetchLeaderboard() {
      setLoading(true);
      setError(null);
      try {
        const tag = activeView === 'specific' ? selectedTag : undefined;
        const data = await apiClient.getLeaderboard({ tag, timeRange });
        if (isMounted) setLeaderboard(data);
      } catch (err: any) {
        console.error("Leaderboard fetch failed:", err);
        if (isMounted) setError(err?.message || "Failed to load leaderboard");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchLeaderboard();
    return () => {
      isMounted = false;
    };
  }, [activeView, selectedTag, timeRange]);

  const selectTag = (tag: string) => {
    setSelectedTag(tag);
    setTagSearch("");
    setTagPopoverOpen(false);
  };

  const filteredTags = availableTags.filter((tag) => tag.toLowerCase().includes(tagSearch.toLowerCase()));

  return (
    <div className="space-y-8 w-full max-w-3xl mx-auto">
      {/* --- CONTROLS SECTION --- */}
      <div className="space-y-6">
        {/* Time Range Buttons */}
        <div className="flex items-center justify-center space-x-2">
          <Button variant={timeRange === 'week' ? 'default' : 'outline'} size="sm" onClick={() => setTimeRange('week')}>This Week</Button>
          <Button variant={timeRange === 'month' ? 'default' : 'outline'} size="sm" onClick={() => setTimeRange('month')}>This Month</Button>
          <Button variant={timeRange === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setTimeRange('all')}>All Time</Button>
        </div>

        {/* Global/Specific Switcher */}
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 p-1 shadow-lg">
            <Button variant={activeView === "global" ? "default" : "ghost"} size="sm" onClick={() => setActiveView("global")} className="relative px-6 py-2 rounded-lg">
              <Trophy className="h-4 w-4 mr-2" /> Global
            </Button>
            <Button variant={activeView === "specific" ? "default" : "ghost"} size="sm" onClick={() => setActiveView("specific")} className="relative px-6 py-2 rounded-lg">
              <Target className="h-4 w-4 mr-2" /> Specific
            </Button>
          </div>
        </div>

        {/* Tag Filter */}
        {activeView === "specific" && (
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4 w-full px-4 sm:px-0">
            <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full sm:w-64 justify-between bg-card/50">
                  {selectedTag ? <Badge variant="secondary" className="bg-primary/10 text-primary">{selectedTag}</Badge> : <span>Filter by Tag...</span>}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="center">
                <Command>
                  <CommandInput placeholder="Search for a tag..." value={tagSearch} onValueChange={setTagSearch} />
                  <CommandList>
                    <CommandEmpty>No tags found.</CommandEmpty>
                    <CommandGroup>
                      {filteredTags.map((tag) => (<CommandItem key={tag} value={tag} onSelect={() => selectTag(tag)}>{tag}</CommandItem>))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedTag && <Button variant="outline" size="sm" onClick={() => setSelectedTag(undefined)} className="w-full sm:w-auto">Clear Filter</Button>}
          </div>
        )}
      </div>

      {/* --- ANIMATED LIST SECTION --- */}
      <div className="mt-8">
        {loading && <div className="text-center text-muted-foreground">Loading...</div>}
        {error && <div className="text-center text-destructive">{error}</div>}
        {!loading && !error && (
          <AnimatedList
            items={leaderboard}
            renderItem={(item, index) => (
              <LeaderboardRow
                rank={index + 1} // Use index for rank to ensure it's always sequential
                user={item.user}
                reputation={item.reputation}
                isCurrentUser={item.isCurrentUser} // Assuming your API provides this
              />
            )}
          />
        )}
      </div>
    </div>
  )
}