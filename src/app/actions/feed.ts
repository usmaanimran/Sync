"use server";

import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getGlobalFeed(pageParam: number = 0, limit: number = 10) {
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id;

  // Calculate pagination boundaries
  const from = pageParam * limit;
  const to = from + limit - 1;

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
    .range(from, to); // Fetch only this chunk

  if (error || !posts) {
    console.error("Failed to fetch global feed:", error);
    return { posts: [], nextPage: undefined };
  }

  const now = new Date().getTime();
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
    const likers = post.post_likes.map((like: any) => ({
      username: like.users?.username,
      avatar_url: like.users?.avatar_url
    })).filter((l: any) => l.username);

    return { ...post, feedScore: score, hasLiked, likeCount, likers };
  });

  const sortedPosts = scoredPosts.sort((a, b) => b.feedScore - a.feedScore);

  return {
    posts: sortedPosts,
    // If we received fewer items than requested, we've hit the end of the DB
    nextPage: posts.length === limit ? pageParam + 1 : undefined,
  };
}