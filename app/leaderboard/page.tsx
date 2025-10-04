"use client"

import { Navigation } from "@/components/navigation";
import { EnhancedLeaderboardView } from "@/components/enhanced-leaderboard-view";

export default function LeaderboardPage() {
  return (
    // MODIFICATION: Changed bg-background to bg-transparent
    <div className="min-h-screen bg-transparent">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Leaderboard
          </h1>
          <EnhancedLeaderboardView />
        </div>
      </main>
    </div>
  );
}