import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Skip middleware for static files and API routes that don't need auth
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/api/posts') ||
        pathname.startsWith('/api/search') ||
        pathname.startsWith('/api/tags') ||
        pathname.startsWith('/api/leaderboard') ||
        pathname.startsWith('/api/profile') ||
        pathname.includes('.') ||
        pathname === '/login' ||
        pathname === '/register'
    ) {
        return NextResponse.next()
    }

    // Redirect unauthenticated users visiting root to login
    if (pathname === '/') {
        try {
            const supabase = getSupabaseServerClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                const loginUrl = request.nextUrl.clone()
                loginUrl.pathname = '/login'
                return NextResponse.redirect(loginUrl)
            }
        } catch (_) {
            const loginUrl = request.nextUrl.clone()
            loginUrl.pathname = '/login'
            return NextResponse.redirect(loginUrl)
        }
    }

    // Check authentication for protected routes
    if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth')) {
        try {
            const supabase = getSupabaseServerClient()
            const { data: { user }, error } = await supabase.auth.getUser()

            if (error || !user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }

            // Add user to request headers for API routes
            const requestHeaders = new Headers(request.headers)
            requestHeaders.set('x-user-id', user.id)
            requestHeaders.set('x-user-email', user.email || '')

            return NextResponse.next({
                request: {
                    headers: requestHeaders,
                },
            })
        } catch (error) {
            return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}
