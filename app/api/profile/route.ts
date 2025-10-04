import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

// GET /api/profile - Get current user's profile
export async function GET(request: NextRequest) {
    try {
        const supabase = getSupabaseServerClient()

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url, bio, reputation, created_at, updated_at')
            .eq('id', user.id)
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(profile)
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// PUT /api/profile - Update current user's profile
export async function PUT(request: NextRequest) {
    try {
        const supabase = getSupabaseServerClient()

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { username, full_name, avatar_url, bio } = body

        // Check if username is being changed and if it's already taken
        if (username) {
            const { data: existingProfile, error: checkError } = await supabase
                .from('profiles')
                .select('id')
                .eq('username', username)
                .neq('id', user.id)
                .single()

            if (checkError && checkError.code !== 'PGRST116') {
                return NextResponse.json({ error: checkError.message }, { status: 500 })
            }

            if (existingProfile) {
                return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
            }
        }

        const updateData: any = {}
        if (username) updateData.username = username
        if (full_name) updateData.full_name = full_name
        if (avatar_url !== undefined) updateData.avatar_url = avatar_url
        if (bio !== undefined) updateData.bio = bio

        const { data: profile, error: updateError } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', user.id)
            .select('id, username, full_name, avatar_url, bio, reputation, created_at, updated_at')
            .single()

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        return NextResponse.json(profile)
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
