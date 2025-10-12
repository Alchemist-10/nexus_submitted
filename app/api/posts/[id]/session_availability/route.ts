// app/api/posts/[id]/session-availability/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getSupabaseServerClient();
  try {
    const postId = params.id;
    const { data, error } = await supabase
      .from("session_availability")
      .select("id, post_id, user_id, user_start_time, user_end_time, mode, chosen_locations, created_at, updated_at, user:profiles!inner(id, username, full_name, avatar_url)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err: any) {
    console.error("GET session_availability error:", err);
    return NextResponse.json({ error: "Failed to fetch availability", details: err.message }, { status: 500 });
  }
}
