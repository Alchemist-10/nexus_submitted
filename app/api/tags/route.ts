import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

// GET /api/tags - Get all tags with post counts
export async function GET(request: NextRequest) {
    try {
        const supabase = getSupabaseServerClient()
        const { searchParams } = new URL(request.url)

        const limit = parseInt(searchParams.get('limit') || '50')
        const sortBy = searchParams.get('sortBy') || 'post_count' // 'post_count', 'name', 'created_at'
        const order = searchParams.get('order') || 'desc'

        const { data: tags, error } = await supabase
            .from('tags')
            .select('id, name, description, post_count, created_at')
            .order(sortBy, { ascending: order === 'asc' })
            .limit(limit)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(tags || [])
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST /api/tags - Create a new tag
export async function POST(request: NextRequest) {
    try {
        const supabase = getSupabaseServerClient()

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { name, description } = body

        if (!name) {
            return NextResponse.json({ error: 'Tag name is required' }, { status: 400 })
        }

        // Check if tag already exists
        const { data: existingTag, error: checkError } = await supabase
            .from('tags')
            .select('id')
            .eq('name', name)
            .single()

        if (checkError && checkError.code !== 'PGRST116') {
            return NextResponse.json({ error: checkError.message }, { status: 500 })
        }

        if (existingTag) {
            return NextResponse.json({ error: 'Tag already exists' }, { status: 409 })
        }

        // Create the tag
        const { data: tag, error: createError } = await supabase
            .from('tags')
            .insert({
                name,
                description: description || null
            })
            .select('id, name, description, post_count, created_at')
            .single()

        if (createError) {
            return NextResponse.json({ error: createError.message }, { status: 500 })
        }

        return NextResponse.json(tag, { status: 201 })
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
