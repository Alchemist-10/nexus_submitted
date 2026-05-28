import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { LeaderboardEntry } from "@/lib/types"

// GET /api/leaderboard - Get leaderboard data
export async function GET(request: NextRequest) {
    try {
        const supabase = getSupabaseServerClient()
        const { searchParams } = new URL(request.url)

        const tag = searchParams.get('tag')
        const limit = parseInt(searchParams.get('limit') || '50')
        const timeRange = searchParams.get('timeRange') || 'all' // 'week', 'month', 'all'

        let query = supabase
            .from('profiles')
            .select(`   
        id,
        username,
        full_name,
        avatar_url,
        reputation,
        created_at
      `)
            .order('reputation', { ascending: false })
            .limit(limit)

        // Apply time filter if specified
        if (timeRange !== 'all') {
            const now = new Date()
            let startDate: Date

            switch (timeRange) {
                case 'week':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                    break
                case 'month':
                    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
                    break
                default:
                    startDate = new Date(0)
            }

            query = query.gte('created_at', startDate.toISOString())
        }

        // If filtering by tag, we need to get users who have posts with that tag
        if (tag) {
            const { data: tagData, error: tagError } = await supabase
                .from('tags')
                .select('id')
                .eq('name', tag)
                .single()

            if (tagError || !tagData) {
                return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
            }

            // Get users who have posts with this tag
            const { data: postAuthors, error: postError } = await supabase
                .from('post_tags')
                .select(`
          posts!inner(author_id),
          posts!inner(author:profiles(id, username, full_name, avatar_url, reputation))
        `)
                .eq('tag_id', tagData.id)

            if (postError) {
                return NextResponse.json({ error: postError.message }, { status: 500 })
            }

            // Extract unique authors and their reputation
            const authorMap = new Map()
            postAuthors?.forEach((item: any) => {
                const author = item.posts.author
                if (author && !authorMap.has(author.id)) {
                    authorMap.set(author.id, author)
                }
            })

            const leaderboardData = Array.from(authorMap.values())
                .sort((a, b) => b.reputation - a.reputation)
                .slice(0, limit)
                .map((user, index) => ({
                    rank: index + 1,
                    user: {
                        name: user.full_name,
                        username: user.username,
                        avatar: user.avatar_url || '/placeholder.svg?height=40&width=40'
                    },
                    reputation: user.reputation,
                    isCurrentUser: false // This would need to be determined based on auth
                }))

            return NextResponse.json(leaderboardData)
        }

        const { data: profiles, error } = await query

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Transform data to match frontend interface
        const leaderboardData: LeaderboardEntry[] = profiles?.map((profile, index) => ({
            rank: index + 1,
            user: {
                name: profile.full_name,
                username: profile.username,
                avatar: profile.avatar_url || '/placeholder.svg?height=40&width=40'
            },
            reputation: profile.reputation,
            isCurrentUser: false // This would need to be determined based on auth
        })) || []

        return NextResponse.json(leaderboardData)
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
