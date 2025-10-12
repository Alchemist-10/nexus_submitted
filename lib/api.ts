// lib/api.ts
import { Post, Comment, LeaderboardEntry, SearchResult, Tag, User, PaginatedResponse } from './types'

// Detect if the code is running on the server
const isServer = typeof window === 'undefined';

// ✅ FIX: Construct the base URL correctly.
// This creates an absolute URL when on the server, and a relative one on the client.
// Make sure to set NEXT_PUBLIC_SITE_URL in your .env.local file (e.g., NEXT_PUBLIC_SITE_URL=http://localhost:3000)
const API_BASE_URL = isServer
  ? `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api`
  : '/api';


class ApiClient {
    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${API_BASE_URL}${endpoint}`

        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        })

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Request failed with no JSON body' }))
            throw new Error(error.error || `Request failed with status ${response.status}`)
        }

        const text = await response.text();
        return text ? JSON.parse(text) : ({} as T);
    }

    // --- VOTE METHODS ---

    async votePost(
        id: string,
        voteType: 'up' | 'down'
    ): Promise<{ message: string; voteType: string | null; upvotes?: number }> {
        if (voteType !== 'up' && voteType !== 'down') {
            throw new Error(`apiClient.votePost: invalid voteType "${String(voteType)}"`)
        }

        const payload = { voteType }
        return this.request<{ message: string; voteType: string | null; upvotes?: number }>(
            `/posts/${id}/vote`,
            {
                method: 'POST',
                body: JSON.stringify(payload),
            }
        )
    }

    async removeVote(postId: string): Promise<{ message: string; voteType: string | null; upvotes?: number }> {
        return this.request<{ message: string; voteType: string | null; upvotes?: number }>(`/posts/${postId}/vote`, {
            method: 'DELETE',
        })
    }

    async getUserVote(postId: string): Promise<{ voteType: string | null }> {
        return this.request<{ voteType: string | null }>(`/posts/${postId}/vote`)
    }

    // --- OTHER METHODS ---

    async getPosts(params: {
    page?: number;
    limit?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
    feed?: 'timeline' | 'merged' | 'engaged' | 'relevance';
    search?: string;
    postTypes?: string[];
    tags?: string[];
    batches?: string[];
    semesters?: string[];
    }): Promise<{ data: Post[] }> {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.order) searchParams.set('order', params.order);
    if (params.feed) searchParams.set('feed', params.feed);
    if (params.search) searchParams.set('search', params.search);
    if (params.postTypes && params.postTypes.length > 0) searchParams.set('postTypes', params.postTypes.join(','));
    if (params.tags && params.tags.length > 0) searchParams.set('tags', params.tags.join(','));
    if (params.batches && params.batches.length > 0) searchParams.set('batches', params.batches.join(','));
    if (params.semesters && params.semesters.length > 0) searchParams.set('semesters', params.semesters.join(','));

    const queryString = searchParams.toString();
    return this.request<{ data: Post[] }>(`/posts?${queryString}`);
    }

    async getPost(id: string): Promise<{ data: Post }> {
        return this.request<{ data: Post }>(`/posts/${id}`)
    }

  async createPost(data: {
    title: string;
    content: string;
    postType: string;
    tags?: string[];
    images?: string[];
    // NEW: Add optional availability fields
    availability_start_date?: string;
    availability_end_date?: string;
    preferred_start_time?: string;
    preferred_end_time?: string;
}): Promise<Post> {
    return this.request<Post>('/posts', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

    async updatePost(id: string, data: {
        title?: string
        content?: string
        postType?: string
        tags?: string[]
        images?: string[]
    }): Promise<Post> {
        return this.request<Post>(`/posts/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        })
    }

    async deletePost(id: string): Promise<{ message: string }> {
        return this.request<{ message: string }>(`/posts/${id}`, {
            method: 'DELETE',
        })
    }

    async createComment(data: {
        postId: string
        content: string
    }): Promise<Comment> {
        return this.request<Comment>('/comments', {
            method: 'POST',
            body: JSON.stringify(data),
        })
    }

    async getComments(postId: string): Promise<Comment[]> {
        const response = await this.request<{ data: Comment[] }>(`/comments?postId=${postId}`)
        return response.data || []
    }

    async voteComment(id: string, voteType: 'up' | 'down'): Promise<{ message: string; voteType: string | null }> {
        return this.request<{ message: string; voteType: string | null }>(`/comments/${id}/vote`, {
            method: 'POST',
            body: JSON.stringify({ voteType }),
        })
    }

    async removeCommentVote(id: string): Promise<{ message: string; voteType: string | null }> {
        return this.request<{ message: string; voteType: string | null }>(`/comments/${id}/vote`, {
            method: 'DELETE',
        })
    }

    async getLeaderboard(params?: {
        tag?: string
        limit?: number
        timeRange?: 'week' | 'month' | 'all'
    }): Promise<LeaderboardEntry[]> {
        const searchParams = new URLSearchParams()

        if (params?.tag) searchParams.set('tag', params.tag)
        if (params?.limit) searchParams.set('limit', params.limit.toString())
        if (params?.timeRange) searchParams.set('timeRange', params.timeRange)

        const queryString = searchParams.toString()
        return this.request<LeaderboardEntry[]>(`/leaderboard${queryString ? `?${queryString}` : ''}`)
    }

    async search(params: {
        q: string
        type?: 'posts' | 'users' | 'tags' | 'all'
        limit?: number
    }): Promise<SearchResult> {
        const searchParams = new URLSearchParams()

        searchParams.set('q', params.q)
        if (params.type) searchParams.set('type', params.type)
        if (params.limit) searchParams.set('limit', params.limit.toString())

        return this.request<SearchResult>(`/search?${searchParams.toString()}`)
    }

    async getProfileByUsername(username: string): Promise<any> {
        return this.request(`/profile/${username}`);
    }

    async sendFriendRequest(userId: string): Promise<any> {
        return this.request('/connections', {
            method: 'POST',
            body: JSON.stringify({ userId })
        });
    }

    async removeFriend(userId: string): Promise<any> {
        return this.request(`/connections/${userId}`, {
            method: 'DELETE'
        });
    }
    async autocomplete(params: { q: string; limit?: number }) {
    const searchParams = new URLSearchParams();
    searchParams.set("q", params.q);
    if (params.limit) searchParams.set("limit", String(params.limit));
    return this.request<{ suggestions: Array<{ type: string; id?: string; value: string }> }>(
    `/autocomplete?${searchParams.toString()}`
    );
    }

   async createSessionProposal(postId: string, payload: {
        mode: string;
        selectedDate: string;
        startTime: string;
        endTime: string;
        chosenLocations: string[];
    }): Promise<any> {
        // We transform the simple payload into the shape your API route expects
        const apiPayload = {
            mode: payload.mode,
            selectedDates: [payload.selectedDate],
            selectedTimeSlots: [`${payload.startTime}-${payload.endTime}`],
            chosenLocation: payload.chosenLocations.length > 0 ? payload.chosenLocations[0] : null,
        };
        return this.request(`/posts/${postId}/session-proposals`, {
            method: 'POST',
            body: JSON.stringify(apiPayload),
        });
    }

    // --- Proposal related helpers (added) ---

    // Fetches all proposals for a post
    async getProposals(postId: string): Promise<{ data: any[] }> {
        return this.request<{ data: any[] }>(`/posts/${postId}/session-proposals`);
    }

  async acceptProposal(proposalId: string): Promise<{ data: any }> {
    return this.request<{ data: any }>(`/session-proposals/${proposalId}/accept`, {
        method: 'POST',
    });
}

// Rejects a single proposal
async rejectProposal(proposalId: string): Promise<{ data: any }> {
    return this.request<{ data: any }>(`/session-proposals/${proposalId}/reject`, {
        method: 'POST',
    });
}

    // Finalizes the schedule for a post (greedy algorithm)
    async finalizeProposals(postId: string): Promise<{ data: any }> {
        return this.request<{ data: any }>(`/posts/${postId}/finalize`, {
            method: 'POST',
        });
    }
    // In lib/api.ts, inside the ApiClient class

async getNotifications(): Promise<{ data: any[] }> {
    return this.request<{ data: any[] }>('/notifications');
}

}

export const apiClient = new ApiClient()
