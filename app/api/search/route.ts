    import { NextRequest, NextResponse } from "next/server"
    import { getSupabaseServerClient } from "@/lib/supabase-server"
    import { SearchResult } from "@/lib/types"

    // GET /api/search - Search across posts, users, and tags
    export async function GET(request: NextRequest) {
        try {
            const supabase = getSupabaseServerClient()
            const { searchParams } = new URL(request.url)

            const query = searchParams.get('q')
            const type = searchParams.get('type') || 'all' // 'posts', 'users', 'tags', 'all'
            const limit = parseInt(searchParams.get('limit') || '10')

            if (!query) {
                return NextResponse.json({ error: 'Search query is required' }, { status: 400 })
            }

            const searchTerm = `%${query}%`
            const results: SearchResult = {
                posts: [],
                users: [],
                tags: []
            }

            // Search posts
            if (type === 'all' || type === 'posts') {
                const { data: posts, error: postsError } = await supabase
                    .from('posts')
                    .select(`
            id,
            content,
            post_type,
            upvotes,
            comment_count,
            created_at,
            author:profiles(id, username, full_name, avatar_url, reputation),
            tags:post_tags(tag:tags(id, name))
            `)
                    .ilike('content', searchTerm)
                    .order('created_at', { ascending: false })
                    .limit(limit)

                if (postsError) {
                    return NextResponse.json({ error: postsError.message }, { status: 500 })
                }

                results.posts = posts?.map(post => ({
                    id: post.id,
                    author: {
                        name: post.author?.full_name || 'Unknown',
                        username: post.author?.username || 'unknown',
                        avatar: post.author?.avatar_url || '/placeholder.svg?height=40&width=40'
                    },
                    content: post.content,
                    timestamp: new Date(post.created_at).toLocaleString(),
                    upvotes: post.upvotes,
                    commentCount: post.comment_count,
                    tags: post.tags?.map((pt: any) => pt.tag.name) || [],
                    postType: post.post_type,
                    images: []
                })) || []
            }

            // Search users
            if (type === 'all' || type === 'users') {
                const { data: users, error: usersError } = await supabase
                    .from('profiles')
                    .select('id, username, full_name, avatar_url, reputation, bio')
                    .or(`username.ilike.${searchTerm},full_name.ilike.${searchTerm},bio.ilike.${searchTerm}`)
                    .order('reputation', { ascending: false })
                    .limit(limit)

                if (usersError) {
                    return NextResponse.json({ error: usersError.message }, { status: 500 })
                }

                results.users = users?.map(user => ({
                    id: user.id,
                    email: '', // Not exposing email in search results
                    username: user.username,
                    full_name: user.full_name,
                    avatar_url: user.avatar_url,
                    bio: user.bio,
                    reputation: user.reputation,
                    created_at: '',
                    updated_at: ''
                })) || []
            }

            // Search tags
            if (type === 'all' || type === 'tags') {
                const { data: tags, error: tagsError } = await supabase
                    .from('tags')
                    .select('id, name, description, post_count')
                    .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
                    .order('post_count', { ascending: false })
                    .limit(limit)

                if (tagsError) {
                    return NextResponse.json({ error: tagsError.message }, { status: 500 })
                }

                results.tags = tags?.map(tag => ({
                    id: tag.id,
                    name: tag.name,
                    description: tag.description,
                    post_count: tag.post_count,
                    created_at: ''
                })) || []
            }

            return NextResponse.json(results)
        } catch (error) {
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
        }
    }
