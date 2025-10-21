import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

// GET /api/posts - Fetches posts, including session and meet link data
export async function GET(request: NextRequest) {
  const supabase = getSupabaseServerClient();
  const { searchParams } = request.nextUrl;

  const feedType = searchParams.get("feed") || "timeline";
  const sortBy = searchParams.get("sortBy") || "created_at";
  const order = searchParams.get("order") || "desc";

  const search = searchParams.get("search");
  const postTypes = searchParams.get("postTypes")?.split(",");
  const tags = searchParams.get("tags")?.split(",");
  const batches = searchParams.get("batches")?.split(",");
  const semesters = searchParams.get("semesters")?.split(",");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let query = supabase
      .from("posts")
      .select(
        `
                id,  created_at, content, title, tags, post_type, images, upvotes, comment_count,
                availability_start_date, availability_end_date, preferred_start_time, preferred_end_time,
                google_meet_link,
                author:profiles!inner(id, username, full_name, avatar_url, batch, semester),
                user_vote:votes!left(vote_type, user_id),
                sessions(proposer_id, scheduled_at, duration_minutes)
            `
      )
      .order(sortBy, { ascending: order === "asc" });

    // --- Feed & Advanced Filters Logic ---
    if (feedType === "relevance") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("interests")
        .eq("id", user.id)
        .single();
      const interests = profile?.interests || [];
      if (interests.length > 0) {
        query = query.overlaps("tags", interests);
      } else {
        return NextResponse.json({ data: [] });
      }
    } else if (feedType === "engaged") {
      const { data: postIds, error } = await supabase.rpc(
        "get_engaged_post_ids",
        { user_id_input: user.id }
      );
      if (error) throw error;
      if (postIds && postIds.length > 0) {
        query = query.in(
          "id",
          postIds.map((item: any) => item.id)
        );
      } else {
        return NextResponse.json({ data: [] });
      }
    } else if (feedType === "merged") {
      const { data: friendIds } = await supabase.rpc("get_friend_ids", {
        user_id_input: user.id,
      });
      if (friendIds && friendIds.length > 0) {
        query = query.in(
          "author_id",
          friendIds.map((item: any) => item.id)
        );
      } else {
        return NextResponse.json({ data: [] });
      }
    }

    if (search)
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    if (postTypes && postTypes.length > 0)
      query = query.in("post_type", postTypes);
    if (tags && tags.length > 0) query = query.overlaps("tags", tags);
    if (batches && batches.length > 0)
      query = query.in("author.batch", batches);
    if (semesters && semesters.length > 0)
      query = query.in("author.semester", semesters);

    const { data, error } = await query;
    if (error) throw error;

    const transformedPosts = data
      .map((post: any) => ({
        ...post,
        user_vote: post.user_vote.filter((v: any) => v.user_id === user.id),
      }))
      .map((post: any) => ({
        id: post.id,
        author: post.author,
        content: post.content,
        title: post.title,
        timestamp: post.created_at,
        upvotes: post.upvotes,
        commentCount: post.comment_count,
        tags: post.tags || [],
        postType: post.post_type,
        images: post.images || [],
        isUpvoted:
          post.user_vote.length > 0 && post.user_vote[0].vote_type === "up",
        isDownvoted:
          post.user_vote.length > 0 && post.user_vote[0].vote_type === "down",
        availability_start_date: post.availability_start_date,
        availability_end_date: post.availability_end_date,
        preferred_start_time: post.preferred_start_time,
        preferred_end_time: post.preferred_end_time,
        google_meet_link: post.google_meet_link,
        sessions: post.sessions || [],
        finalized_scheduled_at:
          (post.sessions &&
            post.sessions.length > 0 &&
            post.sessions[0].scheduled_at) ||
          null,
      }));

    return NextResponse.json({ data: transformedPosts });
  } catch (error: any) {
    console.error("Error in GET /api/posts:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch posts", details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/posts - Creates a post
export async function POST(request: NextRequest) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ✅ FIXED: Simplified to a single try...catch block
  try {
    const {
      title,
      content,
      postType,
      tags,
      images,
      availability_start_date,
      availability_end_date,
      preferred_start_time,
      preferred_end_time,
      google_meet_link,
    } = await request.json();

    if (!title || !content || !postType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { data: newPost, error: postError } = await supabase
      .from("posts")
      .insert({
        title,
        content,
        post_type: postType,
        tags,
        images,
        author_id: user.id,
        availability_start_date,
        availability_end_date,
        preferred_start_time,
        preferred_end_time,
        google_meet_link,
      })
      .select("id")
      .single();

    if (postError) throw postError;

    if (tags && tags.length > 0) {
      const { data: tagData } = await supabase
        .from("tags")
        .upsert(
          tags.map((name: string) => ({ name })),
          { onConflict: "name" }
        )
        .select("id, name");

      if (tagData) {
        const postTagLinks = tagData.map((tag) => ({
          post_id: newPost.id,
          tag_id: tag.id,
        }));
        await supabase.from("post_tags").insert(postTagLinks);
      }
    }

    return NextResponse.json(
      { message: "Post created successfully", data: newPost },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error in POST /api/posts:", error.message);
    return NextResponse.json(
      { error: "Failed to create post", details: error.message },
      { status: 500 }
    );
  }
} // ✅ FIXED: Removed the extra closing brace that was here
