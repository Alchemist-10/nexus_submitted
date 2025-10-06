// middleware.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// This function handles creating a Supabase client that can read/write cookies
const createSupabaseClient = (request: NextRequest) => {
    // We need to create a new response so we can attach the refreshed session cookie
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({ name, value, ...options })
                    response = NextResponse.next({
                        request: { headers: request.headers },
                    })
                    response.cookies.set({ name, value, ...options })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({ name, value: '', ...options })
                    response = NextResponse.next({
                        request: { headers: request.headers },
                    })
                    response.cookies.set({ name, value: '', ...options })
                },
            },
        }
    );

    return { supabase, response };
};

export async function middleware(request: NextRequest) {
    const { supabase, response } = createSupabaseClient(request);

    // ✅ STEP 1: REFRESH SESSION
    // This is the core logic that fixes your error. It refreshes the user's
    // session cookie on every request, preventing random logouts.
    const { data: { session } } = await supabase.auth.getSession();

    // ✅ STEP 2: YOUR CUSTOM ROUTE PROTECTION LOGIC
    // This logic runs *after* the session has been refreshed.
    const { pathname } = request.nextUrl;
    const user = session?.user;

    // Redirect unauthenticated users from the home page to the login page
    if (!user && pathname === '/') {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = '/login';
        return NextResponse.redirect(loginUrl);
    }

    // Note: You may not need to protect API routes here if they are already
    // checking for a user in the route handler itself. This provides an
    // extra layer of security.

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - /login
         * - /register
         * - /api/auth (Supabase auth callbacks)
         */
        '/((?!_next/static|_next/image|favicon.ico|login|register|api/auth).*)',
    ],
}