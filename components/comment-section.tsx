// components/comment-section.tsx

"use client"

import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/api'
import { Comment as CommentType } from '@/lib/types' // Use type alias to avoid naming conflict
import { Comment } from "@/components/comment" // Your existing component for a single comment
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { useRealtimeComments } from '@/lib/hooks/useRealtime'

interface CommentSectionProps {
    postId: string;
}

export function CommentSection({ postId }: CommentSectionProps) {
    const { comments, setComments } = useRealtimeComments(postId);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Fetch initial comments when the component mounts
    const fetchComments = useCallback(async () => {
        setLoading(true);
        try {
            const fetchedComments = await apiClient.getComments(postId);
            setComments(fetchedComments);
        } catch (error) {
            console.error("Failed to fetch comments:", error);
        } finally {
            setLoading(false);
        }
    }, [postId, setComments]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    const handleSubmitComment = async () => {
        if (!newComment.trim()) return;
        setSubmitting(true);
        try {
            // Create the comment. The realtime hook will handle adding it to the list.
            await apiClient.createComment({ postId, content: newComment });
            setNewComment("");
        } catch (error) {
            console.error("Failed to post comment:", error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="pt-4 mt-4 border-t border-border/50 animate-in fade-in-50 duration-300">
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center text-muted-foreground py-4">Loading comments...</div>
                ) : comments.length > 0 ? (
                    comments.map(comment => (
                        // Here we use your existing Comment component for each item
                        <Comment key={comment.id} {...comment as any} />
                    ))
                ) : (
                    <p className="text-center text-sm text-muted-foreground py-4">No comments yet. Be the first to reply!</p>
                )}
            </div>
            <div className="mt-6 flex items-start space-x-3">
                <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1"
                    disabled={submitting}
                />
                <Button onClick={handleSubmitComment} disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Post
                </Button>
            </div>
        </div>
    )
}