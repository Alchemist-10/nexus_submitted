import { Post, Comment, LeaderboardEntry, SearchResult, Tag, User, PaginatedResponse } from './types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api'

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

        // Handle cases where the response body might be empty (e.g., 204 No Content)
        const text = await response.text();
        return text ? JSON.parse(text) : ({} as T);
    }

    // --- VOTE METHODS ---

    async votePost(
        id: string,
        voteType: 'up' | 'down'
    ): Promise<{ message: string; voteType: string | null; upvotes?: number }> {
        // Defensive validation
        if (voteType !== 'up' && voteType !== 'down') {
            throw new Error(`apiClient.votePost: invalid voteType "${String(voteType)}"`)
        }

        const payload = { voteType }
        console.debug('[apiClient.votePost] ->', `/posts/${id}/vote`, payload)

        return this.request<{ message: string; voteType: string | null; upvotes?: number }>(
            `/posts/${id}/vote`,
            {
                method: 'POST',
                body: JSON.stringify(payload),
                // REMOVED: Redundant Content-Type header, as the base `request` method already handles this.
            }
        )
    }

    async removeVote(postId: string): Promise<{ message: string; voteType: string | null; upvotes?: number }> {
        console.debug('[apiClient.removeVote] ->', `/posts/${postId}/vote`, 'DELETE')
        return this.request<{ message: string; voteType: string | null; upvotes?: number }>(`/posts/${postId}/vote`, {
            method: 'DELETE',
        })
    }

    async getUserVote(postId: string): Promise<{ voteType: string | null }> {
        console.debug('[apiClient.getUserVote] ->', `/posts/${postId}/vote`, 'GET')
        return this.request<{ voteType: string | null }>(`/posts/${postId}/vote`)
    }

    // --- OTHER METHODS (UNCHANGED) ---

    async getPosts(params: {
    page?: number;
    limit?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
    feed?: 'timeline' | 'merged' | 'engaged' | 'relevance';
    // New filter types
    search?: string;
    postTypes?: string[];
    tags?: string[];
    batches?: string[];
    semesters?: string[];
  }): Promise<{ data: Post[] }> {
    const searchParams = new URLSearchParams();

    // Standard params
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.order) searchParams.set('order', params.order);
    if (params.feed) searchParams.set('feed', params.feed);

    // New filter params (serialize arrays to comma-separated strings)
    if (params.search) searchParams.set('search', params.search);
    if (params.postTypes && params.postTypes.length > 0) searchParams.set('postTypes', params.postTypes.join(','));
    if (params.tags && params.tags.length > 0) searchParams.set('tags', params.tags.join(','));
    if (params.batches && params.batches.length > 0) searchParams.set('batches', params.batches.join(','));
    if (params.semesters && params.semesters.length > 0) searchParams.set('semesters', params.semesters.join(','));

    const queryString = searchParams.toString();
    return this.request<{ data: Post[] }>(`/posts?${queryString}`);
  }

    async getPost(id: string): Promise<Post> {
        return this.request<Post>(`/posts/${id}`)
    }

    async createPost(data: {
        title: string
        content: string
        postType: string
        tags?: string[]
        images?: string[]
    }): Promise<Post> {
        return this.request<Post>('/posts', {
            method: 'POST',
            body: JSON.stringify(data),
        })
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

    // ... other methods like getTags, createTag, getProfile etc.
    async getProfileByUsername(username: string): Promise<any> {
        return this.request(`/profile/${username}`);
    }

    // You will also need methods for connections
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
    async createSessionProposal(postId: string, payload: {
        mode: string;
        selectedDates: string[];
        selectedTimeSlots: string[];
        chosenLocation: string | null;
    }): Promise<any> {
        return this.request(`/posts/${postId}/session-proposals`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

}

export const apiClient = new ApiClient()