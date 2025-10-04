// app/profile/[username]/page.tsx

"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from 'next/link'
import { User } from '@supabase/supabase-js'

// Import your custom client-side Supabase helper
import { getSupabaseBrowserClient } from "@/lib/supabase-client" // NOTE: Ensure your path is correct

// Import your project's UI components
import { Navigation } from "@/components/navigation"
import { UserStatsCard } from "@/components/user-stats-card"
import { EnhancedPostCard } from "@/components/enhanced-post-card" // Using the more advanced post card
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Loader2, Boxes, Trophy, MessageSquare, ThumbsUp } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// --- TYPE DEFINITIONS ---
// These should ideally live in a central `types.ts` file
type Profile = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  reputation: number;
  interests: string[];
};

type Post = any; // Replace with your detailed Post type for better type safety

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const supabase = getSupabaseBrowserClient(); // Use your client-side helper
  const { toast } = useToast();

  // --- STATE MANAGEMENT ---
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState({ nodes: 0, posts: 0 });
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);

  // --- DATA FETCHING ---
  const fetchData = async () => {
    if (!username) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // 1. Get the profile by username
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();

      if (profileError) throw new Error("Profile not found");
      setProfile(profileData);

      // 2. Fetch posts, friends, and connection status in parallel
      const [
        { data: postsData },
        { data: friendsData },
        { data: connectionData }
      ] = await Promise.all([
        supabase.from("posts").select("*, author:profiles(*)").eq("author_id", profileData.id),
        supabase.rpc('get_friend_ids', { user_id_input: profileData.id }),
        user ? supabase.from('connections').select('status').or(`and(requester_id.eq.${user.id},addressee_id.eq.${profileData.id}),and(requester_id.eq.${profileData.id},addressee_id.eq.${user.id})`).single() : Promise.resolve({ data: null })
      ]);

      setPosts(postsData || []);
      setStats({ nodes: friendsData?.length || 0, posts: postsData?.length || 0 });
      setConnectionStatus(connectionData?.status || 'none');

    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [username]);


  // --- ACTION HANDLERS ---
  const sendFriendRequest = async () => {
    if (!currentUser || !profile) return;
    const { error } = await supabase
      .from('connections')
      .insert({ requester_id: currentUser.id, addressee_id: profile.id, status: 'pending' });

    if (error) {
      toast({ title: "Error", description: "Could not send friend request.", variant: "destructive" });
    } else {
      setConnectionStatus('pending');
      toast({ title: "Success!", description: "Friend request sent." });
    }
  };

  const removeFriend = async () => {
    if (!currentUser || !profile) return;
    const { error } = await supabase.from('connections').delete().or(`and(requester_id.eq.${currentUser.id},addressee_id.eq.${profile.id}),and(requester_id.eq.${profile.id},addressee_id.eq.${currentUser.id})`);

    if (error) {
      toast({ title: "Error", description: "Could not remove friend.", variant: "destructive" });
    } else {
      setConnectionStatus('none');
      toast({ title: "Success", description: "Friend removed." });
    }
  };

  // --- RENDER LOGIC ---
  const renderConnectionButton = () => {
    if (!currentUser || !profile) return null;
    if (currentUser.id === profile.id) {
      return <Link href="/settings"><Button variant="outline">Edit Profile</Button></Link>;
    }
    switch (connectionStatus) {
      case 'pending': return <Button disabled>Request Sent</Button>;
      case 'accepted': return <Button variant="destructive" onClick={removeFriend}>Remove Friend</Button>;
      default: return <Button onClick={sendFriendRequest}>Add Friend</Button>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Profile not found.</h2>
        <p className="text-muted-foreground">The user "{username}" does not exist.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <Card className="nexus-card bg-card/80 backdrop-blur-md border-border/50 p-8 mb-8">
            <div className="flex flex-col md:flex-row items-center text-center md:text-left md:items-start space-y-6 md:space-y-0 md:space-x-8">
              <Avatar className="h-32 w-32 ring-4 ring-primary/30">
                <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                <AvatarFallback className="bg-muted text-4xl">{profile.full_name?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-center md:justify-between mb-4">
                  <div>
                    <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      {profile.full_name}
                    </h1>
                    <p className="text-muted-foreground">@{profile.username}</p>
                  </div>
                  <div className="mt-4 sm:mt-0">{renderConnectionButton()}</div>
                </div>
                <p className="text-foreground mb-4 leading-relaxed max-w-prose">{profile.bio || "No bio provided."}</p>
              </div>
            </div>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <UserStatsCard label="Nodes" value={stats.nodes} icon={<Boxes className="h-5 w-5" />} />
            <UserStatsCard label="Reputation" value={profile.reputation} icon={<Trophy className="h-5 w-5" />} />
            <UserStatsCard label="Posts" value={stats.posts} icon={<MessageSquare className="h-5 w-5" />} />
            <UserStatsCard label="Upvotes" value={0} icon={<ThumbsUp className="h-5 w-5" />} />
          </div>

          {/* Posts and Interests */}
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="posts">Posts ({posts.length})</TabsTrigger>
              <TabsTrigger value="interests">Interests</TabsTrigger>
              <TabsTrigger value="comments" disabled>Comments</TabsTrigger>
            </TabsList>
            <TabsContent value="posts" className="space-y-6 mt-8">
              {posts.length > 0 ? (
                posts.map((post) => (<EnhancedPostCard key={post.id} {...post} onVoteSuccess={fetchData} />))
              ) : (
                <Card className="nexus-card bg-card/80 backdrop-blur-md border-border/50 text-center py-12">
                  <p className="text-muted-foreground">{profile.full_name} hasn't posted anything yet.</p>
                </Card>
              )}
            </TabsContent>
            <TabsContent value="interests" className="mt-8">
              <Card className="nexus-card bg-card/80 backdrop-blur-md border-border/50 p-6">
                <div className="flex flex-wrap gap-2">
                  {(profile.interests && profile.interests.length > 0) ? (
                    profile.interests.map((interest) => (
                      <Badge key={interest} variant="secondary" className="nexus-tag">{interest}</Badge>
                    ))
                  ) : <p className="text-muted-foreground">No interests listed.</p>}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}