"use server";

import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Retrieves the post feed for a specified hub.
 * Utilizes Next.js unstable_cache for edge caching.
 */
export const getMasterEventsDirectory = unstable_cache(
  async (hubId: string = "default") => {
    // Log cache misses for debugging cache invalidation
    console.log("🔴 CACHE MISS: EXECUTING EXPENSIVE SUPABASE QUERY");
    console.time("Supabase Fetch");

    const { data, error } = await supabase
      .from('posts')
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
      .eq('hub_id', hubId)
      .order('created_at', { ascending: false });

    console.timeEnd("Supabase Fetch");

    if (error) {
      throw new Error(error.message);
    }
    
    return data;
  },
  ['master-events-directory'],
  {
    tags: ['hub-events'],
    revalidate: 3600,
  }
);