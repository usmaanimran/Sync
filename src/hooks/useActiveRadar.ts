import { useEffect } from "react";
import { supabaseClient } from "@/utils/supabaseClient";

export function useActiveRadar(
  filterString: string | null | undefined,
  setPosts: React.Dispatch<React.SetStateAction<any[]>>
) {
  useEffect(() => {
    // Safely exit if filter string is not yet available
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
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [filterString, setPosts]);
}