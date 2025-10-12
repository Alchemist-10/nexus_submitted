import { NextRequest, NextResponse } from "next/server";
import { getTries } from "@/lib/trie-service";
import { getSupabaseServerClient } from "@/lib/supabase-server"; // Import Supabase client

const MAX_SUGGESTIONS = 10;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const rawQ = searchParams.get("q") ?? "";
    const q = rawQ.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ suggestions: [] }, { status: 200 });
    }

    // Perform all searches in parallel for speed
    const [
        { tagTrie, userTrie },
        postSuggestionsResponse
    ] = await Promise.all([
        getTries(),
        getSupabaseServerClient()
            .from('posts')
            .select('id, title')
            .ilike('title', `%${q}%`)
            .limit(5) // Limit the DB query to keep it fast
    ]);


    // Process trie results
    const tagSuggestions = tagTrie.search(q).slice(0, MAX_SUGGESTIONS);
    const userSuggestions = userTrie.search(q).slice(0, MAX_SUGGESTIONS);

    const users = userSuggestions.map((name) => ({
      type: "user" as const,
      id: name,
      value: name,
    }));

    const tags = tagSuggestions.map((name) => ({
      type: "tag" as const,
      id: name,
      value: name,
    }));

    // Process post results
    const posts = (postSuggestionsResponse.data || []).map((post) => ({
        type: 'post' as const,
        id: post.id,
        value: post.title
    }));

    // Merge posts first, then users, then tags, and cap total length
    const merged = [...posts, ...users, ...tags].slice(0, MAX_SUGGESTIONS);

    const res = NextResponse.json({ suggestions: merged }, { status: 200 });
    res.headers.set("Cache-Control", "s-maxage=60, stale-while-revalidate=120");

    return res;
  } catch (error) {
    console.error("Autocomplete error:", error);
    return NextResponse.json({ suggestions: [] }, { status: 500 });
  }
}
