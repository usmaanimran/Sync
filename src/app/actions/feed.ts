"use server";

import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getGlobalFeed() {
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id;

  // 1. Just fetch the data (Notice how clean the select string is now)
  const { data: posts, error } = await supabase
    .from("posts")
    .select(`
      id,
      content,
      image_url,
      created_at,
      user_id,
      users!inner ( full_name, username, avatar_url ),
      post_likes ( user_id, users ( username, avatar_url ) )
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !posts) {
    console.error("Failed to fetch global feed:", error);
    return [];
  }

  const now = new Date().getTime();

  // 2. Process the data using JavaScript
  const scoredPosts = posts.map(post => {
    let score = 100;
    const postTime = new Date(post.created_at).getTime();
    const hoursOld = (now - postTime) / (1000 * 60 * 60);
    
    score -= hoursOld * 2;
    if (post.user_id === currentUserId && hoursOld > 1) {
      score -= 40; 
    }
    score += Math.random() * 15;

    const hasLiked = post.post_likes.some((like: any) => like.user_id === currentUserId);
    const likeCount = post.post_likes.length;

    // 3. THIS is where the mapping logic actually goes!
    const likers = post.post_likes.map((like: any) => ({
      username: like.users?.username,
      avatar_url: like.users?.avatar_url
    })).filter((l: any) => l.username);

    return { ...post, feedScore: score, hasLiked, likeCount, likers };
  });

  return scoredPosts.sort((a, b) => b.feedScore - a.feedScore);
}