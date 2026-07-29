import { useEffect, useState } from "react";
import { supabaseClient } from "@/utils/supabaseClient";

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabaseClient
        .from("notifications")
        .select(`
          id, type, is_read, updated_at, post_id,
          post:posts (
            id,
            image_url,
            post_likes ( user_id, users ( username, avatar_url ) ),
            post_comments ( user_id, users ( username, avatar_url ) )
          )
        `)
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(20);

      if (!error && data) {
        setNotifications(data);
        setUnreadCount(data.filter((n: any) => !n.is_read).length);
      }
    };

    fetchNotifications();

    const channel = supabaseClient
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => fetchNotifications()
      )
      .subscribe();

    return () => { supabaseClient.removeChannel(channel); };
  }, [userId]);

  const markAsRead = async () => {
    if (!userId || unreadCount === 0) return;
    await supabaseClient.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
    setUnreadCount(0);
  };

  return { notifications, unreadCount, markAsRead };
}