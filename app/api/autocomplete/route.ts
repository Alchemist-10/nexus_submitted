// app/api/autocomplete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getTries } from "@/lib/trie-service";

const MAX_SUGGESTIONS = 10;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const rawQ = searchParams.get("q") ?? "";
    const q = rawQ.trim();

    if (!q || q.length < 2) {
      // Don't initialize or search tries for tiny queries
      return NextResponse.json({ suggestions: [] }, { status: 200 });
    }

    const { tagTrie, userTrie } = await getTries();

    // Trie.search returns string[] (lowercased if trie was built that way)
    const tagSuggestions = tagTrie.search(q).slice(0, MAX_SUGGESTIONS);
    const userSuggestions = userTrie.search(q).slice(0, MAX_SUGGESTIONS);

    // Build standardized suggestion objects
    // You may choose to expose real IDs if you change the trie to map id->value.
    const users = userSuggestions.map((name) => ({
      type: "user",
      id: name,
      value: name,
    }));

    const tags = tagSuggestions.map((name) => ({
      type: "tag",
      id: name,
      value: name,
    }));

    // Merge users first, then tags, and cap total length
    const merged = [...users, ...tags].slice(0, MAX_SUGGESTIONS);

    const res = NextResponse.json({ suggestions: merged }, { status: 200 });

    // small cache so repeated quick queries can be cached at the edge
    res.headers.set("Cache-Control", "s-maxage=60, stale-while-revalidate=120");

    return res;
  } catch (error) {
    console.error("Autocomplete error:", error);
    return NextResponse.json({ suggestions: [] }, { status: 500 });
  }
}
