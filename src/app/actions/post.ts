"use server";

import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { v2 as cloudinary } from "cloudinary";

// Initialize Cloudinary Server SDK for asset destruction
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Initialize Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to extract the public ID from a Cloudinary URL
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

/**
 * Creates a new post linked to the authenticated user.
 */
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
        image_url: JSON.stringify(imageUrls), // Store array as JSON string
      }
    ])
    .select();

  if (error) {
    console.error("Post creation failed:", error);
    return { success: false, error: error.message };
  }
  return { success: true, post: data[0] };
}

/**
 * Updates an existing post and destroys orphaned images in Cloudinary.
 */
export async function updatePost(postId: string, content: string, finalUrls: string[], urlsToDelete: string[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized: no active session." };
  }

  // 1. Destroy removed images from Cloudinary
  for (const url of urlsToDelete) {
    const publicId = getCloudinaryPublicId(url);
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.error(`Failed to destroy Cloudinary asset: ${publicId}`, err);
      }
    }
  }

  // 2. Update the post in Supabase
  const { data, error } = await supabase
    .from("posts")
    .update({
      content: content.trim(),
      image_url: JSON.stringify(finalUrls),
    })
    .eq("id", postId)
    .eq("user_id", session.user.id) // Security check to ensure ownership
    .select();

  if (error) {
    console.error("Post update failed:", error);
    return { success: false, error: error.message };
  }
  return { success: true, post: data[0] };
}

/**
 * Deletes a post entirely and nukes all attached media from Cloudinary.
 */
export async function deletePost(postId: string, urlsToDelete: string[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized: no active session." };
  }

  // 1. Nuke all associated images from Cloudinary
  for (const url of urlsToDelete) {
    const publicId = getCloudinaryPublicId(url);
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.error(`Failed to destroy Cloudinary asset: ${publicId}`, err);
      }
    }
  }

  // 2. Delete the row in Supabase
  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", session.user.id);

  if (error) {
    console.error("Post deletion failed:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

/**
 * Fetches all posts by a specific user_id, joining with the users table.
 */
export async function getUserPosts(userId: string) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("posts")
    .select(`
      id,
      content,
      image_url,
      created_at,
      users!inner (
        full_name,
        username,
        avatar_url
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch posts:", error);
    return [];
  }
  return data;
}