// Database types matching frontend interfaces
export interface User {
    id: string
    email: string
    username: string
    full_name: string
    avatar_url?: string
    bio?: string
    reputation: number
    created_at: string
    updated_at: string
}

export interface Post {
    id: string
    author_id: string
    content: string
    post_type: 'Question' | 'Project' | 'Academic' | 'Misc'
    images?: string[]
    upvotes: number
    comment_count: number
    created_at: string
    updated_at: string
    author?: User
    tags?: Tag[]
    user_vote?: 'up' | 'down' | null
}

export interface Comment {
    id: string
    post_id: string
    author_id: string
    content: string
    upvotes: number
    created_at: string
    updated_at: string
    author?: User
    user_vote?: 'up' | 'down' | null
}

export interface Tag {
    id: string
    name: string
    description?: string
    post_count: number
    created_at: string
}

export interface Vote {
    id: string
    user_id: string
    post_id?: string
    comment_id?: string
    vote_type: 'up' | 'down'
    created_at: string
}

export interface LeaderboardEntry {
    rank: number
    user: User
    reputation: number
    isCurrentUser?: boolean
}

// API Response types
export interface ApiResponse<T> {
    data?: T
    error?: string
    message?: string
}

export interface PaginatedResponse<T> {
    data: T[]
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
    }
}

// Search types
export interface SearchResult {
    posts: Post[]
    users: User[]
    tags: Tag[]
}

// Frontend component props (matching existing interfaces)
export interface PostCardProps {
    id: string
    author: {
        name: string
        username: string
        avatar: string
    }
    content: string
    timestamp: string
    upvotes: number
    commentCount: number
    tags: string[]
    isUpvoted?: boolean
    images?: string[]
    postType?: string
}

export interface LeaderboardRowProps {
    rank: number
    user: {
        name: string
        username?: string
        avatar?: string
    }
    reputation: number
    isCurrentUser?: boolean
}
