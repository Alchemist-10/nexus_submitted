// lib/trie-service.ts
import { getSupabaseServerClient } from "@/lib/supabase-server";

class TrieNode {
  children: Map<string, TrieNode> = new Map();
  isEndOfWord: boolean = false;
}

export class Trie {
  private root: TrieNode = new TrieNode();

  insert(word: string): void {
    if (!word) return;
    let currentNode = this.root;
    for (const char of word.toLowerCase()) {
      if (!currentNode.children.has(char)) {
        currentNode.children.set(char, new TrieNode());
      }
      currentNode = currentNode.children.get(char)!;
    }
    currentNode.isEndOfWord = true;
  }

  search(prefix: string): string[] {
    const lowercasedPrefix = (prefix || "").toLowerCase();
    let currentNode = this.root;
    for (const char of lowercasedPrefix) {
      if (!currentNode.children.has(char)) return [];
      currentNode = currentNode.children.get(char)!;
    }
    const results: string[] = [];
    this.collectAllWords(currentNode, lowercasedPrefix, results);
    return results;
  }

  private collectAllWords(node: TrieNode, currentPrefix: string, results: string[]): void {
    if (results.length >= 10) return; // configurable limit
    if (node.isEndOfWord) results.push(currentPrefix);
    for (const [char, childNode] of node.children.entries()) {
      this.collectAllWords(childNode, currentPrefix + char, results);
      if (results.length >= 10) return;
    }
  }
}

// Singletons cached in-memory for server process
let tagTrie: Trie | null = null;
let userTrie: Trie | null = null;

async function initializeTries() {
  console.log("Initializing search Tries...");
  const supabase = getSupabaseServerClient();

  const [tagsRes, usersRes] = await Promise.all([
    supabase.from("tags").select("name"),
    supabase.from("profiles").select("username, full_name"),
  ]);

  if (tagsRes.error) {
    console.error("Error loading tags for trie:", tagsRes.error);
  }
  if (usersRes.error) {
    console.error("Error loading profiles for trie:", usersRes.error);
  }

  tagTrie = new Trie();
  if (tagsRes.data) {
    for (const tag of tagsRes.data) {
      if (tag?.name) tagTrie.insert(String(tag.name));
    }
  }

  userTrie = new Trie();
  if (usersRes.data) {
    for (const user of usersRes.data) {
      if (user?.username) userTrie.insert(String(user.username));
      // Insert full name too so people can type real names
      if (user?.full_name) userTrie.insert(String(user.full_name));
    }
  }

  console.log("Search Tries initialized.");
}

export async function getTries(): Promise<{ tagTrie: Trie; userTrie: Trie }> {
  if (!tagTrie || !userTrie) {
    await initializeTries();
  }
  return { tagTrie: tagTrie!, userTrie: userTrie! };
}
