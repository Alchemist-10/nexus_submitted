import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

// GET /api/posts/[id] - Get a specific post
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = getSupabaseServerClient()
        const { id } = params

        const { data: post, error } = await supabase
            .from('posts')
            .select(`
        *,
        author:profiles(id, username, full_name, avatar_url, reputation),
        tags:post_tags(tag:tags(id, name, description)),
        comments(
          id,
          content,
          upvotes,
          created_at,
          author:profiles(id, username, full_name, avatar_url, reputation)
        )
      `)
            .eq('id', id)
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 404 })
        }

        // Transform data
        const transformedPost = {
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
            images: post.images || [],
            comments: post.comments?.map((comment: any) => ({
                id: comment.id,
                content: comment.content,
                upvotes: comment.upvotes,
                timestamp: new Date(comment.created_at).toLocaleString(),
                author: {
                    name: comment.author?.full_name || 'Unknown',
                    username: comment.author?.username || 'unknown',
                    avatar: comment.author?.avatar_url || '/placeholder.svg?height=40&width=40'
                }
            })) || []
        }

        return NextResponse.json(transformedPost)
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// PUT /api/posts/[id] - Update a post
export async function PUT(
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
        const { content, postType, tags, images } = body

        // Check if user owns the post
        const { data: existingPost, error: fetchError } = await supabase
            .from('posts')
            .select('author_id')
            .eq('id', id)
            .single()

        if (fetchError || !existingPost) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 })
        }

        if (existingPost.author_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Update the post
        const { data: post, error: updateError } = await supabase
            .from('posts')
            .update({
                content,
                post_type: postType,
                images: images || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select(`
        *,
        author:profiles(id, username, full_name, avatar_url, reputation)
      `)
            .single()

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        // Update tags if provided
        if (tags !== undefined) {
            // Remove existing tags
            await supabase
                .from('post_tags')
                .delete()
                .eq('post_id', id)

            // Add new tags
            if (tags.length > 0) {
                const tagIds = []
                for (const tagName of tags) {
                    const { data: existingTag } = await supabase
                        .from('tags')
                        .select('id')
                        .eq('name', tagName)
                        .single()

                    if (existingTag) {
                        tagIds.push(existingTag.id)
                    } else {
                        const { data: newTag, error: tagError } = await supabase
                            .from('tags')
                            .insert({ name: tagName })
                            .select('id')
                            .single()

                        if (!tagError && newTag) {
                            tagIds.push(newTag.id)
                        }
                    }
                }

                if (tagIds.length > 0) {
                    const postTagInserts = tagIds.map(tagId => ({
                        post_id: id,
                        tag_id: tagId
                    }))

                    await supabase
                        .from('post_tags')
                        .insert(postTagInserts)
                }
            }
        }

        // Transform response
        const response = {
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
            tags: tags || [],
            postType: post.post_type,
            images: post.images || []
        }

        return NextResponse.json(response)
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// DELETE /api/posts/[id] - Delete a post
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

        // Check if user owns the post
        const { data: existingPost, error: fetchError } = await supabase
            .from('posts')
            .select('author_id')
            .eq('id', id)
            .single()

        if (fetchError || !existingPost) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 })
        }

        if (existingPost.author_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Delete the post (cascade will handle related records)
        const { error: deleteError } = await supabase
            .from('posts')
            .delete()
            .eq('id', id)

        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 500 })
        }

        return NextResponse.json({ message: 'Post deleted successfully' })
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
