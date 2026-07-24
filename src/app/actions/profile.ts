"use server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { v2 as cloudinary } from "cloudinary";

// Initialize Cloudinary Server SDK
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Extracts the Cloudinary public_id from a secure URL
 * Example: https://res.cloudinary.com/drdy6ktb6/image/upload/v1712345/sample_avatar.jpg -> sample_avatar
 */
function getCloudinaryPublicId(url: string): string | null {
  if (!url || !url.includes("cloudinary.com")) return null;
  try {
    const parts = url.split("/upload/");
    if (parts.length < 2) return null;
    // Remove the version string (e.g., v1712345/) if present
    const pathAfterUpload = parts[1].replace(/^v\d+\//, "");
    
    // Strip file extension (.jpg, .png, etc.)
    const publicId = pathAfterUpload.substring(0, pathAfterUpload.lastIndexOf("."));
    return publicId || null;
  } catch (err) {
    console.error("Failed to parse Cloudinary public_id:", err);
    return null;
  }
}

// Update Avatar with Automatic Asset Cleanup
export async function updateAvatarUrl(newImageUrl: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized: no active session." };
  }
  const userId = session.user.id;

  // 1. Fetch current avatar_url from Supabase before updating
  const { data: user } = await supabase
    .from("users")
    .select("avatar_url")
    .eq("id", userId)
    .single();
  const currentAvatarUrl = user?.avatar_url;

  // 2. If old avatar was hosted on Cloudinary and is different from the new one, delete it
  if (currentAvatarUrl && currentAvatarUrl !== newImageUrl) {
    const publicId = getCloudinaryPublicId(currentAvatarUrl);
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
        console.log(`Successfully purged old Cloudinary asset: ${publicId}`);
      } catch (err) {
        console.error("Failed to destroy old Cloudinary image:", err);
      }
    }
  }

  // 3. Commit new avatar URL (or default avatar vector) to Supabase
  const { error } = await supabase
    .from("users")
    .update({ avatar_url: newImageUrl })
    .eq("id", userId);

  return { success: !error, error: error?.message };
}

// Update Banner with Automatic Asset Cleanup
export async function updateBannerUrl(newImageUrl: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized: no active session." };
  }
  const userId = session.user.id;

  // 1. Fetch current banner_url from Supabase before updating
  const { data: user } = await supabase
    .from("users")
    .select("banner_url")
    .eq("id", userId)
    .single();
  const currentBannerUrl = user?.banner_url;

  // 2. If old banner was hosted on Cloudinary and is different from the new one, delete it
  if (currentBannerUrl && currentBannerUrl !== newImageUrl) {
    const publicId = getCloudinaryPublicId(currentBannerUrl);
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
        console.log(`Successfully purged old Cloudinary banner asset: ${publicId}`);
      } catch (err) {
        console.error("Failed to destroy old Cloudinary banner image:", err);
      }
    }
  }

  // 3. Commit new banner URL to Supabase
  const { error } = await supabase
    .from("users")
    .update({ banner_url: newImageUrl })
    .eq("id", userId);

  return { success: !error, error: error?.message };
}

// Update Profile Text
export async function updateProfileData(data: {
  name: string;
  username: string;
  bio: string;
  websites: string[];
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized: no active session." };
  }
  const userId = session.user.id;
  const cleanNewUsername = data.username.toLowerCase().trim();

  // 1. Fetch current user data to check cooldowns
  const { data: currentUser } = await supabase
    .from("users")
    .select("username, last_username_change")
    .eq("id", userId)
    .single();

  if (!currentUser) return { success: false, error: "User not found." };

  const updatePayload: any = {
    full_name: data.name,
    bio: data.bio,
    websites: data.websites.filter((url) => url.trim() !== ""),
  };

  // 2. Only process username logic if they ACTUALLY changed it
  if (cleanNewUsername !== currentUser.username) {
    // A. Cooldown Check (30 Days)
    if (currentUser.last_username_change) {
      const lastChangeDate = new Date(currentUser.last_username_change);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      if (lastChangeDate > thirtyDaysAgo) {
        return { success: false, error: "You can only change your username once every 30 days." };
      }
    }

    // B. Check if taken by someone else
    const { data: takenCheck } = await supabase
      .from("users")
      .select("id")
      .eq("username", cleanNewUsername)
      .neq("id", userId) // Exclude themselves from the check
      .maybeSingle();

    if (takenCheck) return { success: false, error: "Username is already taken." };

    // C. Stage the new username and timestamp for the update
    updatePayload.username = cleanNewUsername;
    updatePayload.last_username_change = new Date().toISOString();
  }

  // 3. Save to database
  const { error } = await supabase
    .from("users")
    .update(updatePayload)
    .eq("id", userId);

  return { success: !error, error: error?.message };
}

// Get Profile Data
// Get Profile Data
export async function getUserProfile(userId: string) {
  if (!userId) return null;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const { data, error } = await supabase
    .from("users")
    // ADDED profile_effect RIGHT HERE 👇
    .select("avatar_url, banner_url, full_name, username, bio, websites, profile_effect")
    .eq("id", userId)
    .single();

  return error ? null : data;
}


// Update Profile Effect (Matrix, Default, etc.)
export async function updateProfileEffect(effect: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized: no active session." };
  }
  
  const userId = session.user.id;

  const { error } = await supabase
    .from("users")
    .update({ profile_effect: effect })
    .eq("id", userId);

  return { success: !error, error: error?.message };
}