"use server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- NEW: Bundled Notification Trigger ---
async function triggerBundledNotification(postOwnerId: string, postId: string, type: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.id === postOwnerId) return; // No self-notifs

  await supabase.from("notifications").upsert({
    user_id: postOwnerId,
    post_id: postId,
    type: type,
    is_read: false,
    updated_at: new Date().toISOString()
  }, {
    onConflict: 'user_id, post_id, type' 
  });
}

// 1. Toggle a Like (Heart)
export async function toggleLike(postId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  const userId = session.user.id;

  const { data: post } = await supabase.from("posts").select("user_id").eq("id", postId).single();

  const { data: existingLike } = await supabase
    .from("post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingLike) {
    await supabase.from("post_likes").delete().eq("id", existingLike.id);
    return { success: true, liked: false };
  } else {
    await supabase.from("post_likes").insert([{ post_id: postId, user_id: userId }]);
    if (post) await triggerBundledNotification(post.user_id, postId, 'like');
    return { success: true, liked: true };
  }
}

// 2. Fetch Comments
export async function getComments(postId: string) {
  const { data, error } = await supabase
    .from("post_comments")
    .select(`id, content, created_at, users ( full_name, username, avatar_url )`)
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) return { success: false, error: error.message };
  return { success: true, comments: data };
}

// 3. Post a New Comment
export async function addComment(postId: string, content: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  if (!content.trim()) return { success: false, error: "Comment cannot be empty" };

  const { data: post } = await supabase.from("posts").select("user_id").eq("id", postId).single();

  const { data, error } = await supabase
    .from("post_comments")
    .insert([{ post_id: postId, user_id: session.user.id, content: content.trim() }])
    .select(`id, content, created_at, users ( full_name, username, avatar_url )`)
    .single();

  if (error) return { success: false, error: error.message };
  if (post) await triggerBundledNotification(post.user_id, postId, 'comment');
  return { success: true, comment: data };
}

// 4. Fetch Users Who Liked
export async function getPostLikes(postId: string) {
  const { data, error } = await supabase
    .from("post_likes")
    .select(`users ( full_name, username, avatar_url )`)
    .eq("post_id", postId);
  if (error) return { success: false, error: error.message };
  const formattedLikers = data.map((item: any) => item.users).filter(Boolean);
  return { success: true, likers: formattedLikers };
}