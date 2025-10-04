import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

// GET /api/profile/[username] - Get user profile by username
export async function GET(
    request: NextRequest,
    { params }: { params: { username: string } }
) {
    try {
        const supabase = getSupabaseServerClient()
        const { username } = params

        const { data: profile, error } = await supabase
            .from('profiles')
            .select(`
        id,
        username,
        full_name,
        avatar_url,
        bio,
        reputation,
        created_at,
        updated_at
      `)
            .eq('username', username)
            .single()

        if (error) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        return NextResponse.json(profile)
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
