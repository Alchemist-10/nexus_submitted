import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

// POST /api/posts/[id]/vote - Vote on a post
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = getSupabaseServerClient()
        const { id } = params
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json().catch(() => null)
        const voteType = (body as any)?.voteType?.startsWith('down') ? 'down' : 'up';

        // Check if post exists and prevent self-voting
        const { data: post, error: postError } = await supabase
            .from('posts')
            .select('author_id')
            .eq('id', id)
            .single()

        if (postError || !post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 })
        }
        if (post.author_id === user.id) {
            return NextResponse.json({ error: 'Cannot vote on your own post' }, { status: 400 })
        }

        // Get current vote state
        const { data: existingVote } = await supabase
            .from('votes')
            .select('vote_type')
            .eq('post_id', id)
            .eq('user_id', user.id)
            .single()

        // Calculate vote change
        let voteChange = 0
        if (existingVote) {
            if (existingVote.vote_type === voteType) {
                // Same vote - remove it
                voteChange = voteType === 'up' ? -1 : 1
                await supabase.from('votes').delete().eq('post_id', id).eq('user_id', user.id)
            } else {
                // Different vote - change it
                voteChange = voteType === 'up' ? 2 : -2
                await supabase.from('votes').update({ vote_type: voteType }).eq('post_id', id).eq('user_id', user.id)
            }
        } else {
            // New vote
            voteChange = voteType === 'up' ? 1 : -1
            await supabase.from('votes').insert({
                post_id: id,
                user_id: user.id,
                vote_type: voteType
            })
        }

        // Update the post's upvote count to trigger realtime update
        const { data: currentPost } = await supabase
            .from('posts')
            .select('upvotes')
            .eq('id', id)
            .single()

        if (currentPost) {
            const newUpvotes = (currentPost.upvotes || 0) + voteChange
            await supabase
                .from('posts')
                .update({ upvotes: newUpvotes })
                .eq('id', id)
        }

        return NextResponse.json({
            message: 'Vote processed',
            voteType: existingVote?.vote_type === voteType ? null : voteType,
            upvotes: currentPost ? (currentPost.upvotes || 0) + voteChange : 0
        });

    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// GET /api/posts/[id]/vote - Get user's vote on a post
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = getSupabaseServerClient()
        const { id } = params

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: vote, error } = await supabase
            .from('votes')
            .select('vote_type')
            .eq('user_id', user.id)
            .eq('post_id', id)
            .single()

        if (error && error.code !== 'PGRST116') {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ voteType: vote?.vote_type || null })
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// DELETE /api/posts/[id]/vote - Remove user's vote on a post
// /api/posts/[id]/vote/route.ts

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = getSupabaseServerClient()
        const { id } = params
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get current vote to calculate the change
        const { data: existingVote } = await supabase
            .from('votes')
            .select('vote_type')
            .eq('user_id', user.id)
            .eq('post_id', id)
            .single()

        if (!existingVote) {
            return NextResponse.json({ message: 'No vote to remove', voteType: null, upvotes: 0 })
        }

        // Delete vote
        const { error: deleteError } = await supabase
            .from('votes')
            .delete()
            .eq('user_id', user.id)
            .eq('post_id', id)

        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 500 })
        }

        // Calculate vote change and update post
        const voteChange = existingVote.vote_type === 'up' ? -1 : 1
        const { data: currentPost } = await supabase
            .from('posts')
            .select('upvotes')
            .eq('id', id)
            .single()

        if (currentPost) {
            const newUpvotes = (currentPost.upvotes || 0) + voteChange
            await supabase
                .from('posts')
                .update({ upvotes: newUpvotes })
                .eq('id', id)
        }

        return NextResponse.json({
            message: 'Vote removed',
            voteType: null,
            upvotes: currentPost ? (currentPost.upvotes || 0) + voteChange : 0
        })
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}