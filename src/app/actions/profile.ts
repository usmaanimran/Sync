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

export async function updateAvatarUrl(newImageUrl: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized: no active session." };
  }
  const userId = session.user.id;

  const { data: user } = await supabase.from("users").select("avatar_url").eq("id", userId).single();
  const currentAvatarUrl = user?.avatar_url;

  if (currentAvatarUrl && currentAvatarUrl !== newImageUrl) {
    const publicId = getCloudinaryPublicId(currentAvatarUrl);
    if (publicId && publicId.includes(userId)) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.error("Failed to destroy old Cloudinary image:", err);
      }
    }
  }

  const { error } = await supabase.from("users").update({ avatar_url: newImageUrl }).eq("id", userId);
  
  revalidateTag(`profile-${userId}`, 'max');
  
  return { success: !error, error: error?.message };
}

export async function updateBannerUrl(newImageUrl: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized: no active session." };
  }
  const userId = session.user.id;

  const { data: user } = await supabase.from("users").select("banner_url").eq("id", userId).single();
  const currentBannerUrl = user?.banner_url;

  if (currentBannerUrl && currentBannerUrl !== newImageUrl) {
    const publicId = getCloudinaryPublicId(currentBannerUrl);
    if (publicId && publicId.includes(userId)) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.error("Failed to destroy old Cloudinary banner image:", err);
      }
    }
  }

  const { error } = await supabase.from("users").update({ banner_url: newImageUrl }).eq("id", userId);
  
  revalidateTag(`profile-${userId}`, 'max');
  
  return { success: !error, error: error?.message };
}

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

  const { data: currentUser } = await supabase.from("users").select("username, last_username_change").eq("id", userId).single();
  if (!currentUser) return { success: false, error: "User not found." };

  const updatePayload: any = {
    full_name: data.name.trim().substring(0, 50),
    bio: data.bio.trim().substring(0, 160),
    websites: data.websites
      .map((url) => url.trim().substring(0, 100))
      .filter((url) => url !== ""),
  };

  if (cleanNewUsername !== currentUser.username) {
    if (currentUser.last_username_change) {
      const lastChangeDate = new Date(currentUser.last_username_change);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      if (lastChangeDate > thirtyDaysAgo) {
        return { success: false, error: "You can only change your username once every 30 days." };
      }
    }

    const { data: takenCheck } = await supabase
      .from("users")
      .select("id")
      .eq("username", cleanNewUsername)
      .neq("id", userId)
      .maybeSingle();

    if (takenCheck) return { success: false, error: "Username is already taken." };

    updatePayload.username = cleanNewUsername;
    updatePayload.last_username_change = new Date().toISOString();
  }

  const { error } = await supabase.from("users").update(updatePayload).eq("id", userId);
  
  revalidateTag(`profile-${userId}`, 'max');
  
  return { success: !error, error: error?.message };
}

export async function getUserProfile(userId: string) {
  if (!userId) return null;

  const getCachedProfile = unstable_cache(
    async () => {
      console.log("🚨 PROFILE CACHE MISS: HITTING SUPABASE");
      const { data, error } = await supabase
        .from("users")
        .select("avatar_url, banner_url, full_name, username, bio, websites, profile_effect")
        .eq("id", userId)
        .single();

      return error ? null : data;
    },
    [`profile-${userId}`], 
    {
      tags: [`profile-${userId}`], 
      revalidate: 3600
    }
  );

  return getCachedProfile();
}

export async function updateProfileEffect(effect: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized: no active session." };
  }
  const userId = session.user.id;

  const { error } = await supabase.from("users").update({ profile_effect: effect }).eq("id", userId);
  
  revalidateTag(`profile-${userId}`, 'max');
  
  return { success: !error, error: error?.message };
}

export async function getUserProfileByUsername(username: string) {
  if (!username) return null;
  const cleanUsername = username.toLowerCase().trim();

  const getCachedProfile = unstable_cache(
    async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, avatar_url, banner_url, full_name, username, bio, websites, profile_effect")
        .eq("username", cleanUsername)
        .single();

      return error ? null : data;
    },
    [`profile-username-${cleanUsername}`],
    {
      tags: [`profile-username-${cleanUsername}`],
      revalidate: 3600
    }
  );

  return getCachedProfile();
}