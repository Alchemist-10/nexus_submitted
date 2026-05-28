# Nexus Backend Documentation

## Overview

This backend provides a complete API for the Nexus social leaderboard application, built with Next.js API routes and Supabase PostgreSQL database.

## Features

- **User Authentication**: Email/password and OAuth (GitHub, Google, Discord)
- **Posts Management**: CRUD operations for posts with upvoting, comments, tags
- **Real-time Updates**: Live updates for posts, comments, and leaderboard
- **Search**: Full-text search across posts, users, and tags
- **Leaderboard**: Global and topic-specific rankings
- **User Profiles**: Profile management with reputation system

## Database Schema

### Core Tables

1. **profiles** - User profiles extending auth.users
2. **posts** - User posts with content, type, images
3. **comments** - Comments on posts
4. **tags** - Categorization tags
5. **votes** - Upvotes/downvotes on posts and comments
6. **post_tags** - Many-to-many relationship between posts and tags

### Key Features

- **Row Level Security (RLS)** enabled on all tables
- **Automatic triggers** for updating counts (upvotes, comments, tags)
- **Real-time subscriptions** for live updates
- **Domain restriction** for email signups (iiitkottayam.ac.in)

## API Endpoints

### Posts

- `GET /api/posts` - Get posts with pagination and filtering
- `POST /api/posts` - Create a new post
- `GET /api/posts/[id]` - Get specific post with comments
- `PUT /api/posts/[id]` - Update a post
- `DELETE /api/posts/[id]` - Delete a post
- `POST /api/posts/[id]/vote` - Vote on a post
- `GET /api/posts/[id]/vote` - Get user's vote on a post

### Comments

- `POST /api/comments` - Create a comment
- `POST /api/comments/[id]/vote` - Vote on a comment

### Leaderboard

- `GET /api/leaderboard` - Get leaderboard data
  - Query params: `tag`, `limit`, `timeRange`

### Search

- `GET /api/search` - Search across posts, users, tags
  - Query params: `q` (required), `type`, `limit`

### Tags

- `GET /api/tags` - Get all tags
- `POST /api/tags` - Create a new tag

### Profile

- `GET /api/profile` - Get current user's profile
- `PUT /api/profile` - Update current user's profile
- `GET /api/profile/[username]` - Get user profile by username

## Setup Instructions

### 1. Environment Variables

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ngwsfyicwrtveajgushg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nd3NmeWljd3J0dmVhamd1c2hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNTQ2NzksImV4cCI6MjA3NDczMDY3OX0.EUoH_lgA3BYpNMx_8U7EDcgmOOr2VvV1JsBC_46uuyM
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN=iiitkottayam.ac.in
```

### 2. Database Setup

Run the migration in your Supabase SQL editor:

```sql
-- Copy and paste the contents of supabase/migrations/001_initial_schema.sql
```

### 3. Supabase Configuration

1. **Authentication Settings**:
   - Go to Authentication → URL Configuration
   - Set Site URL: `http://localhost:3000` (for development)
   - Add Redirect URLs: `http://localhost:3000/**`

2. **OAuth Providers** (optional):
   - Go to Authentication → Providers
   - Enable GitHub, Google, or Discord
   - Configure with your OAuth app credentials

3. **Email Settings**:
   - Go to Authentication → Email
   - Configure SMTP or use Supabase's built-in email service

### 4. Install Dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr
```

### 5. Run the Application

```bash
npm run dev
```

## Frontend Integration

### Using the API Client

```typescript
import { apiClient } from "@/lib/api";

// Get posts
const posts = await apiClient.getPosts({
  page: 1,
  limit: 10,
  sortBy: "created_at",
  order: "desc",
});

// Create a post
const newPost = await apiClient.createPost({
  content: "Hello world!",
  postType: "Question",
  tags: ["React", "Next.js"],
});

// Vote on a post
await apiClient.votePost("post-id", "up");
```

### Real-time Updates

```typescript
import { useRealtimePosts, useRealtimeComments } from '@/lib/hooks/useRealtime'

function PostsList() {
  const { posts, setPosts } = useRealtimePosts()

  // Posts will automatically update when new posts are created
  return (
    <div>
      {posts.map(post => (
        <PostCard key={post.id} {...post} />
      ))}
    </div>
  )
}
```

### Authentication

```typescript
import { authService } from "@/lib/auth";

// Sign in
await authService.signIn("user@iiitkottayam.ac.in", "password");

// Sign up
await authService.signUp("user@iiitkottayam.ac.in", "password", "Full Name");

// OAuth
await authService.signInWithOAuth("github");

// Get current user
const user = await authService.getCurrentUser();
```

## Deployment

### Vercel Deployment

1. **Environment Variables**:
   - Add all environment variables in Vercel dashboard
   - Update `NEXT_PUBLIC_SUPABASE_URL` to your production Supabase URL

2. **Supabase Production Setup**:
   - Update Site URL in Supabase to your production domain
   - Update Redirect URLs to include your production domain
   - Configure production OAuth apps

3. **Deploy**:
   ```bash
   vercel --prod
   ```

### Other Platforms

The application can be deployed to any platform that supports Next.js:

- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## Security Features

- **Row Level Security (RLS)** on all database tables
- **Authentication middleware** for protected routes
- **Domain restriction** for email signups
- **Input validation** on all API endpoints
- **CORS protection** built into Next.js

## Performance Optimizations

- **Database indexes** on frequently queried columns
- **Pagination** for large datasets
- **Real-time subscriptions** for live updates
- **Caching** through Supabase's built-in caching

## Monitoring and Logs

- **Supabase Dashboard** for database monitoring
- **Vercel Analytics** for application monitoring
- **Error boundaries** in React components
- **API error handling** with proper HTTP status codes

## Troubleshooting

### Common Issues

1. **Database connection errors**:
   - Check environment variables
   - Verify Supabase URL and keys

2. **Authentication issues**:
   - Check OAuth provider configuration
   - Verify redirect URLs

3. **Real-time not working**:
   - Check Supabase real-time is enabled
   - Verify RLS policies allow subscriptions

### Support

For issues and questions:

1. Check Supabase logs in the dashboard
2. Review Next.js logs in development
3. Verify environment variables
4. Check network requests in browser dev tools
