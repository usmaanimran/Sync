"use server";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function searchUsers(query: string) {
  // CHANGED: Now triggers from the very first letter (length < 1)
  if (!query || query.trim().length < 1) return { success: true, users: [] };

  const safeQuery = query.toLowerCase().trim();

  const { data, error } = await supabase
    .from("users")
    .select("id, username, full_name, avatar_url")
    .or(`username.ilike.%${safeQuery}%,full_name.ilike.%${safeQuery}%`)
    .limit(8);

  if (error) {
    console.error("Search error:", error);
    return { success: false, error: error.message };
  }

  return { success: true, users: data || [] };
}