import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

// GET /api/comments?postId=xxx - Get comments for a post
export async function GET(request: NextRequest) {
    try {
        const supabase = getSupabaseServerClient()
        const { searchParams } = request.nextUrl
        const postId = searchParams.get('postId')

        if (!postId) {
            return NextResponse.json({ error: 'Post ID is required' }, { status: 400 })
        }

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if post exists
        const { data: post, error: postError } = await supabase
            .from('posts')
            .select('id')
            .eq('id', postId)
            .single()

        if (postError || !post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 })
        }

        // Get comments with author info and user vote status
        const { data: comments, error: commentsError } = await supabase
            .from('comments')
            .select(`
                id,
                content,
                upvotes,
                created_at,
                author:profiles(id, username, full_name, avatar_url, reputation),
                user_vote:votes!left(vote_type)
            `)
            .eq('post_id', postId)
            .eq('votes.user_id', user.id)
            .order('created_at', { ascending: true })

        if (commentsError) {
            return NextResponse.json({ error: commentsError.message }, { status: 500 })
        }

        // Transform comments data
        const transformedComments = comments.map((comment: any) => ({
            id: comment.id,
            content: comment.content,
            upvotes: comment.upvotes,
            timestamp: new Date(comment.created_at).toLocaleString(),
            author: {
                name: comment.author?.full_name || 'Unknown',
                username: comment.author?.username || 'unknown',
                avatar: comment.author?.avatar_url || '/placeholder.svg'
            },
            isUpvoted: comment.user_vote && comment.user_vote.length > 0 && comment.user_vote[0].vote_type === 'up',
            isDownvoted: comment.user_vote && comment.user_vote.length > 0 && comment.user_vote[0].vote_type === 'down'
        }))

        return NextResponse.json({ data: transformedComments })
    } catch (error) {
        console.error('Error in GET /api/comments:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST /api/comments - Create a new comment
export async function POST(request: NextRequest) {
    try {
        const supabase = getSupabaseServerClient()

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { postId, content } = body

        if (!postId || !content) {
            return NextResponse.json({ error: 'Post ID and content are required' }, { status: 400 })
        }

        // Check if post exists
        const { data: post, error: postError } = await supabase
            .from('posts')
            .select('id')
            .eq('id', postId)
            .single()

        if (postError || !post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 })
        }

        // Create the comment
        const { data: comment, error: commentError } = await supabase
            .from('comments')
            .insert({
                post_id: postId,
                author_id: user.id,
                content
            })
            .select(`
        *,
        author:profiles(id, username, full_name, avatar_url, reputation)
      `)
            .single()

        if (commentError) {
            return NextResponse.json({ error: commentError.message }, { status: 500 })
        }

        // Update comment count on the post
        const { data: currentPost, error: fetchError } = await supabase
            .from('posts')
            .select('comment_count')
            .eq('id', postId)
            .single()

        if (!fetchError && currentPost) {
            const { error: updateError } = await supabase
                .from('posts')
                .update({ comment_count: currentPost.comment_count + 1 })
                .eq('id', postId)

            if (updateError) {
                console.error('Error updating comment count:', updateError)
            }
        }

        // Transform response
        const response = {
            id: comment.id,
            content: comment.content,
            upvotes: comment.upvotes,
            timestamp: new Date(comment.created_at).toLocaleString(),
            author: {
                name: comment.author?.full_name || 'Unknown',
                username: comment.author?.username || 'unknown',
                avatar: comment.author?.avatar_url || '/placeholder.svg'
            },
            isUpvoted: false,
            isDownvoted: false
        }

        return NextResponse.json(response, { status: 201 })
    } catch (error) {
        console.error('Error in POST /api/comments:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
