import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

// GET /api/tags/[id] - Fetches a single tag by name
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseServerClient();
    const tagName = decodeURIComponent(params.id);

    if (!tagName) {
      return NextResponse.json({ error: "Tag name is required" }, { status: 400 });
    }

    const { data: tag, error } = await supabase
      .from("tags")
      .select("id, name, description, post_count")
      .eq("name", tagName)
      .single();

    if (error) {
      // If the error is that no rows were found, it's a 404
      if (error.code === 'PGRST116') {
         return NextResponse.json({ error: "Tag not found" }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ data: tag });

  } catch (error: any) {
    console.error(`Error fetching tag:`, error.message);
    return NextResponse.json({ error: "Failed to fetch tag", details: error.message }, { status: 500 });
  }
}
