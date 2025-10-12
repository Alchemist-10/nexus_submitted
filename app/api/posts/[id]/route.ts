// app/posts/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

/**
 * NOTE: getSupabaseServerClient implementation details vary.
 * If your helper needs the request (to forward cookies/session), pass it in:
 *   const supabase = getSupabaseServerClient({ req: request });
 * If your helper already reads cookies from the Next.js runtime, leave as-is.
 */

// GET /api/posts/[id] - Fetches a single post by its ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getSupabaseServerClient(); // <-- pass request if your helper requires it
  const postId = params.id;

  try {
    // 1) Fetch the post itself (do NOT filter by votes.user_id here).
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select(
        `
        id,
        created_at,
        content,
        title,
        tags,
        post_type,
        images,
        upvotes,
        comment_count,
        author:profiles(id, username, full_name, avatar_url)
      `
      )
      .eq("id", postId)
      .single();

    if (postError) {
      // Common: PGRST116 = no rows found for .single()
      if ((postError as any).code === "PGRST116") {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }
      throw postError;
    }

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // 2) Try to get the current user (optional). If there's no user, that's fine.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 3) If we have a user, fetch their vote for this post separately.
    let userVote: { vote_type: string } | null = null;
    if (user?.id) {
      const { data: voteRow, error: voteError } = await supabase
        .from("votes")
        .select("vote_type")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle(); // maybeSingle returns null if no row

      if (voteError) {
        // don't fail the whole request for a vote-fetch error; just log
        console.error("Failed to fetch user vote:", voteError);
      } else {
        userVote = voteRow ?? null;
      }
    }

    // Transform the data for the frontend (defensive)
    const transformedPost = {
      id: post.id,
      author: Array.isArray((post as any).author) ? (post as any).author[0] : (post as any).author,
      content: post.content,
      title: post.title,
      timestamp: post.created_at,
      upvotes: post.upvotes,
      commentCount: post.comment_count,
      tags: post.tags ?? [],
      postType: post.post_type,
      images: post.images ?? [],
      isUpvoted: userVote ? userVote.vote_type === "up" : false,
      isDownvoted: userVote ? userVote.vote_type === "down" : false,
    };

    return NextResponse.json({ data: transformedPost });
  } catch (error: any) {
    console.error("Error fetching single post:", error);
    return NextResponse.json({ error: "Failed to fetch post", details: String(error?.message ?? error) }, { status: 500 });
  }
}

// PATCH /api/posts/[id] - Updates a specific post
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getSupabaseServerClient(); // <-- pass request if needed by your helper
  const postId = params.id;

  // Require authentication for modifying
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title, content, tags, images } = await request.json();

    // Verify the user is the author
    const { data: existingPost, error: fetchError } = await supabase
      .from("posts")
      .select("author_id")
      .eq("id", postId)
      .single();

    if (fetchError || !existingPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if ((existingPost as any).author_id !== user.id) {
      return NextResponse.json({ error: "Forbidden. You are not the author of this post." }, { status: 403 });
    }

    // Update the post
    const { data: updatedPost, error: updateError } = await supabase
      .from("posts")
      .update({ title, content, tags, images, updated_at: new Date().toISOString() })
      .eq("id", postId)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ message: "Post updated successfully", data: updatedPost });
  } catch (error: any) {
    console.error("Error in PATCH /api/posts/[id]:", error);
    return NextResponse.json({ error: "Failed to update post", details: String(error?.message ?? error) }, { status: 500 });
  }
}

// DELETE /api/posts/[id] - Deletes a specific post
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getSupabaseServerClient(); // <-- pass request if needed by your helper
  const postId = params.id;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify the user is the author
    const { data: existingPost, error: fetchError } = await supabase
      .from("posts")
      .select("author_id")
      .eq("id", postId)
      .single();

    if (fetchError || !existingPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if ((existingPost as any).author_id !== user.id) {
      return NextResponse.json({ error: "Forbidden. You are not the author of this post." }, { status: 403 });
    }

    // Delete the post
    const { error: deleteError } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ message: "Post deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Error in DELETE /api/posts/[id]:", error);
    return NextResponse.json({ error: "Failed to delete post", details: String(error?.message ?? error) }, { status: 500 });
  }
}
