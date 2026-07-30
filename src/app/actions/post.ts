"use server";

import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { v2 as cloudinary } from "cloudinary";
import { unstable_cache, revalidateTag } from "next/cache";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getCloudinaryPublicId(url: string): string | null {
  if (!url || !url.includes("cloudinary.com")) return null;
  try {
    const parts = url.split("/upload/");
    if (parts.length < 2) return null;
    const pathAfterUpload = parts[1].replace(/^v\d+\//, "");
    const publicId = pathAfterUpload.substring(0, pathAfterUpload.lastIndexOf("."));
    return publicId || null;
  } catch (err) {
    console.error("Failed to parse Cloudinary public_id:", err);
    return null;
  }
}

export async function createPost(content: string, imageUrls: string[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized: no active session." };
  }

  const { data, error } = await supabase
    .from("posts")
    .insert([
      {
        user_id: session.user.id,
        content: content.trim(),
        image_url: JSON.stringify(imageUrls)
        // hub_id completely removed!
      }
    ])
    .select();

  if (error) {
    console.error("Post creation failed:", error);
    return { success: false, error: error.message };
  }

  try {
    // @ts-ignore
    revalidateTag('hub-events');
    // @ts-ignore
    revalidateTag(`posts-${session.user.id}`);
  } catch (cacheErr) {
    console.warn("Cache revalidation skipped:", cacheErr);
  }

  return { success: true, post: data[0] };
}

export async function updatePost(postId: string, content: string, finalUrls: string[], urlsToDelete: string[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized: no active session." };
  }

  const { data: existingPost } = await supabase
    .from("posts")
    .select("image_url")
    .eq("id", postId)
    .eq("user_id", session.user.id)
    .single();

  if (!existingPost) {
    return { success: false, error: "Unauthorized or post not found." };
  }

  const validUrls = JSON.parse(existingPost.image_url || "[]");
  const safeUrlsToDestroy = urlsToDelete.filter(url => validUrls.includes(url));

  for (const url of urlsToDelete) {
    const publicId = getCloudinaryPublicId(url);
    if (publicId && publicId.includes(session.user.id)) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.error(`Failed to destroy Cloudinary asset: ${publicId}`, err);
      }
    }
  }

  const { data, error } = await supabase
    .from("posts")
    .update({
      content: content.trim(),
      image_url: JSON.stringify(finalUrls),
    })
    .eq("id", postId)
    .eq("user_id", session.user.id)
    .select();

  if (error) {
    console.error("Post update failed:", error);
    return { success: false, error: error.message };
  }

  try {
    // @ts-ignore
    revalidateTag('hub-events');
    // @ts-ignore
    revalidateTag(`posts-${session.user.id}`);
  } catch (cacheErr) {
    console.warn("Cache revalidation skipped:", cacheErr);
  }

  return { success: true, post: data[0] };
}

export async function deletePost(postId: string, urlsToDelete: string[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized: no active session." };
  }

  const { data: existingPost } = await supabase
    .from("posts")
    .select("image_url")
    .eq("id", postId)
    .eq("user_id", session.user.id)
    .single();

  if (!existingPost) {
    return { success: false, error: "Unauthorized or post not found." };
  }

  const validUrls = JSON.parse(existingPost.image_url || "[]");
  const safeUrlsToDestroy = urlsToDelete.filter(url => validUrls.includes(url));

  for (const url of urlsToDelete) {
    const publicId = getCloudinaryPublicId(url);
    if (publicId && publicId.includes(session.user.id)) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.error(`Failed to destroy Cloudinary asset: ${publicId}`, err);
      }
    }
  }

  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", session.user.id);

  if (error) {
    console.error("Post deletion failed:", error);
    return { success: false, error: error.message };
  }

  try {
    // @ts-ignore
    revalidateTag('hub-events');
    // @ts-ignore
    revalidateTag(`posts-${session.user.id}`);
  } catch (cacheErr) {
    console.warn("Cache revalidation skipped:", cacheErr);
  }

  return { success: true };
}

export async function getUserPosts(userId: string) {
  if (!userId) return [];

  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id;

  const { data, error } = await supabase
  .from("posts")
  .select(`
    id,
    content,
    image_url,
    created_at,
    user_id,
    users!inner (
      full_name,
      username,
      avatar_url
    ),
    post_likes ( user_id, users ( username, avatar_url ) ),
    post_comments ( id )
  `)
  
  .eq("user_id", userId)
  .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch posts:", error);
    return [];
  }

  // Map likes dynamically for the current viewer to keep state in sync
  return data.map((post: any) => {
  const hasLiked = post.post_likes?.some((like: any) => like.user_id === currentUserId) || false;
  const likeCount = post.post_likes?.length || 0;
  
  // Extract usernames and avatars
  const likers = post.post_likes?.map((like: any) => ({
    username: like.users?.username,
    avatar_url: like.users?.avatar_url
  })).filter((l: any) => l.username) || [];

  const commentCount = post.post_comments?.length || 0;
    return { ...post, hasLiked, likeCount, commentCount, likers };
  });
}