"use client"

import { useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase-client'
import { Post, Comment } from '@/lib/types'

export function useRealtimePosts() {
    const [posts, setPosts] = useState<Post[]>([])
    const supabase = getSupabaseBrowserClient()

    useEffect(() => {
        // Subscribe to posts changes
        const channel = supabase
            .channel('posts')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'posts'
                },
                (payload) => {
                    console.log('Posts change received!', payload)

                    if (payload.eventType === 'INSERT') {
                        // Fetch the new post with author data
                        supabase
                            .from('posts')
                            .select(`
                *,
                author:profiles(id, username, full_name, avatar_url, reputation),
                tags:post_tags(tag:tags(id, name))
              `)
                            .eq('id', payload.new.id)
                            .single()
                            .then(({ data: newPost }) => {
                                if (newPost) {
                                    const transformedPost = {
                                        id: newPost.id,
                                        author: {
                                            name: newPost.author?.full_name || 'Unknown',
                                            username: newPost.author?.username || 'unknown',
                                            avatar: newPost.author?.avatar_url || '/placeholder.svg?height=40&width=40'
                                        },
                                        content: newPost.content,
                                        timestamp: new Date(newPost.created_at).toLocaleString(),
                                        upvotes: newPost.upvotes,
                                        commentCount: newPost.comment_count,
                                        tags: newPost.tags?.map((pt: any) => pt.tag.name) || [],
                                        postType: newPost.post_type,
                                        images: newPost.images || []
                                    }
                                    setPosts(prev => [transformedPost, ...prev])
                                }
                            })
                    } else if (payload.eventType === 'UPDATE') {
                        setPosts(prev => prev.map(post =>
                            post.id === payload.new.id
                                ? { ...post, upvotes: payload.new.upvotes, commentCount: payload.new.comment_count }
                                : post
                        ))
                    } else if (payload.eventType === 'DELETE') {
                        setPosts(prev => prev.filter(post => post.id !== payload.old.id))
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase])

    return { posts, setPosts }
}

export function useRealtimeComments(postId: string) {
    const [comments, setComments] = useState<Comment[]>([])
    const supabase = getSupabaseBrowserClient()

    useEffect(() => {
        if (!postId) return

        // Subscribe to comments changes for specific post
        const channel = supabase
            .channel(`comments-${postId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'comments',
                    filter: `post_id=eq.${postId}`
                },
                (payload) => {
                    console.log('Comments change received!', payload)

                    if (payload.eventType === 'INSERT') {
                        // Fetch the new comment with author data
                        supabase
                            .from('comments')
                            .select(`
                *,
                author:profiles(id, username, full_name, avatar_url, reputation)
              `)
                            .eq('id', payload.new.id)
                            .single()
                            .then(({ data: newComment }) => {
                                if (newComment) {
                                    const transformedComment = {
                                        id: newComment.id,
                                        post_id: newComment.post_id,
                                        author_id: newComment.author_id,
                                        content: newComment.content,
                                        upvotes: newComment.upvotes,
                                        created_at: newComment.created_at,
                                        updated_at: newComment.updated_at,
                                        author: {
                                            name: newComment.author?.full_name || 'Unknown',
                                            username: newComment.author?.username || 'unknown',
                                            avatar: newComment.author?.avatar_url || '/placeholder.svg?height=40&width=40'
                                        }
                                    }
                                    setComments(prev => [...prev, transformedComment])
                                }
                            })
                    } else if (payload.eventType === 'UPDATE') {
                        setComments(prev => prev.map(comment =>
                            comment.id === payload.new.id
                                ? { ...comment, upvotes: payload.new.upvotes }
                                : comment
                        ))
                    } else if (payload.eventType === 'DELETE') {
                        setComments(prev => prev.filter(comment => comment.id !== payload.old.id))
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase, postId])

    return { comments, setComments }
}

export function useRealtimeLeaderboard() {
    const [leaderboard, setLeaderboard] = useState<any[]>([])
    const supabase = getSupabaseBrowserClient()

    useEffect(() => {
        // Subscribe to profile reputation changes
        const channel = supabase
            .channel('leaderboard')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles'
                },
                (payload) => {
                    console.log('Leaderboard change received!', payload)

                    // Update the leaderboard if reputation changed
                    if (payload.old.reputation !== payload.new.reputation) {
                        setLeaderboard(prev => prev.map(entry =>
                            entry.user.id === payload.new.id
                                ? { ...entry, reputation: payload.new.reputation }
                                : entry
                        ))
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase])

    return { leaderboard, setLeaderboard }
}
