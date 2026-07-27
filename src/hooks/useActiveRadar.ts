import { useEffect, useRef } from "react";
import { supabaseClient } from "@/utils/supabaseClient";

export function useActiveRadar(
  filterString: string | null | undefined,
  setPosts: React.Dispatch<React.SetStateAction<any[]>>,
  syncCallback?: () => void 
) {
  // Track if this is a reconnection vs initial load
  const hasConnectedOnce = useRef(false);

  useEffect(() => {
    if (!filterString) return;

    const channel = supabaseClient
      .channel(`radar-${filterString}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
          filter: filterString,
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            const { data: enrichedPost } = await supabaseClient
              .from("posts")
              .select(`
                id, content, image_url, created_at, 
                users (full_name, username, avatar_url)
              `)
              .eq("id", payload.new.id)
              .single();

            if (enrichedPost) {
              setPosts((prev) => {
                // Prevent duplicate UI rendering if the manual state update already handled it
                if (prev.some((post) => post.id === enrichedPost.id)) {
                  return prev;
                }
                return [enrichedPost, ...prev];
              });
            }
          }

          if (payload.eventType === "DELETE") {
            setPosts((prev) => prev.filter((post) => post.id !== payload.old.id));
          }

          if (payload.eventType === "UPDATE") {
            setPosts((prev) =>
              prev.map((post) =>
                post.id === payload.new.id
                  ? { ...post, content: payload.new.content, image_url: payload.new.image_url }
                  : post
              )
            );
          }
        }
      )
      .subscribe((status) => {
        // Listen for connection status changes
        if (status === "SUBSCRIBED") {
          // If we connected, lost connection, and just got it back: fire the Re-Sync 
          if (hasConnectedOnce.current && syncCallback) {
            console.log("Radar Reconnected: Fetching missed beacons...");
            syncCallback();
          }
          hasConnectedOnce.current = true;
        }
      });

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [filterString, setPosts, syncCallback]); 
}