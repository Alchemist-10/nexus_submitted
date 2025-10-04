import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

// POST /api/comments/[id]/vote - Vote on a comment
export async function POST(
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

        const body = await request.json()
        const { voteType } = body // 'up' or 'down'

        if (!voteType || !['up', 'down'].includes(voteType)) {
            return NextResponse.json({ error: 'Invalid vote type' }, { status: 400 })
        }

        // Check if comment exists
        const { data: comment, error: commentError } = await supabase
            .from('comments')
            .select('id, author_id')
            .eq('id', id)
            .single()

        if (commentError || !comment) {
            return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
        }

        // Check if user is trying to vote on their own comment
        if (comment.author_id === user.id) {
            return NextResponse.json({ error: 'Cannot vote on your own comment' }, { status: 400 })
        }

        // Check for existing vote
        const { data: existingVote, error: voteError } = await supabase
            .from('votes')
            .select('id, vote_type')
            .eq('user_id', user.id)
            .eq('comment_id', id)
            .single()

        if (voteError && voteError.code !== 'PGRST116') {
            return NextResponse.json({ error: voteError.message }, { status: 500 })
        }

        if (existingVote) {
            if (existingVote.vote_type === voteType) {
                // Remove the vote (unvote)
                const { error: deleteError } = await supabase
                    .from('votes')
                    .delete()
                    .eq('id', existingVote.id)

                if (deleteError) {
                    return NextResponse.json({ error: deleteError.message }, { status: 500 })
                }

                return NextResponse.json({ message: 'Vote removed', voteType: null })
            } else {
                // Update the vote
                const { error: updateError } = await supabase
                    .from('votes')
                    .update({ vote_type: voteType })
                    .eq('id', existingVote.id)

                if (updateError) {
                    return NextResponse.json({ error: updateError.message }, { status: 500 })
                }

                return NextResponse.json({ message: 'Vote updated', voteType })
            }
        } else {
            // Create new vote
            const { error: insertError } = await supabase
                .from('votes')
                .insert({
                    user_id: user.id,
                    comment_id: id,
                    vote_type: voteType
                })

            if (insertError) {
                return NextResponse.json({ error: insertError.message }, { status: 500 })
            }

            return NextResponse.json({ message: 'Vote recorded', voteType })
        }
    } catch (error) {
        console.error('Error in POST /api/comments/[id]/vote:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// DELETE /api/comments/[id]/vote - Remove vote on a comment
export async function DELETE(
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

        // Check if comment exists
        const { data: comment, error: commentError } = await supabase
            .from('comments')
            .select('id, author_id')
            .eq('id', id)
            .single()

        if (commentError || !comment) {
            return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
        }

        // Check for existing vote
        const { data: existingVote, error: voteError } = await supabase
            .from('votes')
            .select('id, vote_type')
            .eq('user_id', user.id)
            .eq('comment_id', id)
            .single()

        if (voteError && voteError.code !== 'PGRST116') {
            return NextResponse.json({ error: voteError.message }, { status: 500 })
        }

        if (!existingVote) {
            return NextResponse.json({ error: 'No vote found to remove' }, { status: 404 })
        }

        // Remove the vote
        const { error: deleteError } = await supabase
            .from('votes')
            .delete()
            .eq('id', existingVote.id)

        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 500 })
        }

        return NextResponse.json({ message: 'Vote removed', voteType: null })
    } catch (error) {
        console.error('Error in DELETE /api/comments/[id]/vote:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
