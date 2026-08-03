"use server";

import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- Bundled Notification Trigger ---
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

// 1. Toggle a Post Like (Heart)
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

// 2. Fetch Comments (Includes Threading & Like Metadata)
export async function getComments(postId: string) {
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id;

  const { data, error } = await supabase
    .from("post_comments")
    .select(`
      id, 
      content, 
      created_at, 
      parent_id,
      users ( full_name, username, avatar_url ),
      comment_likes ( user_id )
    `)
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) return { success: false, error: error.message };

  const formattedComments = data.map((comment: any) => ({
    ...comment,
    likeCount: comment.comment_likes?.length || 0,
    hasLiked: comment.comment_likes?.some((like: any) => like.user_id === currentUserId) || false
  }));

  return { success: true, comments: formattedComments };
}

// 3. Post a New Comment or Reply
export async function addComment(postId: string, content: string, parentId: string | null = null) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  if (!content.trim()) return { success: false, error: "Comment cannot be empty" };

  const { data: post } = await supabase.from("posts").select("user_id").eq("id", postId).single();

  const { data, error } = await supabase
    .from("post_comments")
    .insert([{ 
      post_id: postId, 
      user_id: session.user.id, 
      content: content.trim(),
      parent_id: parentId
    }])
    .select(`id, content, created_at, parent_id, users ( full_name, username, avatar_url )`)
    .single();

  if (error) return { success: false, error: error.message };

  if (post && post.user_id !== session.user.id) {
    await triggerBundledNotification(post.user_id, postId, 'comment');
  }

  const formattedNewComment = { ...data, likeCount: 0, hasLiked: false };

  return { success: true, comment: formattedNewComment };
}

// 4. Fetch Users Who Liked a Post
export async function getPostLikes(postId: string) {
  const { data, error } = await supabase
    .from("post_likes")
    .select(`users ( full_name, username, avatar_url )`)
    .eq("post_id", postId);

  if (error) return { success: false, error: error.message };
  const formattedLikers = data.map((item: any) => item.users).filter(Boolean);
  return { success: true, likers: formattedLikers };
}

// 5. Toggle a Comment Like
export async function toggleCommentLike(commentId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  const userId = session.user.id;

  const { data: existingLike } = await supabase
    .from("comment_likes")
    .select("id")
    .eq("comment_id", commentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingLike) {
    await supabase.from("comment_likes").delete().eq("id", existingLike.id);
    return { success: true, liked: false };
  } else {
    await supabase.from("comment_likes").insert([{ comment_id: commentId, user_id: userId }]);
    return { success: true, liked: true };
  }
}