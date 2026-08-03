"use server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getLinkStatus(targetUserId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { status: 'none' };

  const { data } = await supabase
    .from("user_links")
    .select("status, sender_id")
    .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${session.user.id})`)
    .maybeSingle();

  if (!data) return { status: 'none' };
  
  if (data.status === 'pending' && data.sender_id !== session.user.id) {
    return { status: 'needs_response' };
  }
  return { status: data.status };
}

export async function toggleLink(targetUserId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  const userId = session.user.id;

  const { data: existing } = await supabase
    .from("user_links")
    .select("id, status, sender_id")
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${userId})`)
    .maybeSingle();

  if (existing) {
    // 1. Delete link record
    await supabase.from("user_links").delete().eq("id", existing.id);

    // 2. Delete ALL associated link notifications between these users to clean the UI
    await supabase
      .from("notifications")
      .delete()
      .in("type", ["link_request", "link_accepted"])
      .or(`and(user_id.eq.${targetUserId},sender_id.eq.${userId}),and(user_id.eq.${userId},sender_id.eq.${targetUserId})`);

    return { success: true, newStatus: 'none' };
  } else {
    // 1. Insert new link request
    await supabase.from("user_links").insert([
      { sender_id: userId, receiver_id: targetUserId, status: 'pending' }
    ]);
    
    // 2. Wipe any old ghost requests between these two to prevent stacking
    await supabase.from("notifications").delete()
      .eq("user_id", targetUserId)
      .eq("sender_id", userId)
      .in("type", ["link_request", "link_accepted"]);

    // 3. Insert fresh notification
    await supabase.from("notifications").insert([{
      user_id: targetUserId,
      sender_id: userId,
      type: 'link_request',
      is_read: false,
      updated_at: new Date().toISOString()
    }]);

    return { success: true, newStatus: 'pending' };
  }
}

export async function acceptLinkRequest(requesterId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false };
  const userId = session.user.id;

  // 1. Update link status
  const { error } = await supabase
    .from("user_links")
    .update({ status: 'accepted' })
    .eq("sender_id", requesterId)
    .eq("receiver_id", userId);

  if (!error) {
    // 2. Delete the request notification from the receiver's UI
    await supabase
      .from("notifications")
      .delete()
      .eq("user_id", userId)
      .eq("sender_id", requesterId)
      .eq("type", "link_request");

    // 3. Clear any old "accepted" notifications to prevent duplicates
    await supabase.from("notifications").delete()
      .eq("user_id", requesterId)
      .eq("sender_id", userId)
      .eq("type", "link_accepted");

    // 4. Send "Accepted" notification to the original requester
    await supabase.from("notifications").insert([{
      user_id: requesterId,
      sender_id: userId,
      type: 'link_accepted',
      is_read: false,
      updated_at: new Date().toISOString()
    }]);
  }
  return { success: !error };
}

export async function rejectLinkRequest(requesterId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false };
  const userId = session.user.id;

  // 1. Delete link request
  const { error } = await supabase
    .from("user_links")
    .delete()
    .eq("sender_id", requesterId)
    .eq("receiver_id", userId);

  // 2. Delete request notification from receiver's UI
  await supabase
    .from("notifications")
    .delete()
    .eq("user_id", userId)
    .eq("sender_id", requesterId)
    .eq("type", "link_request");

  return { success: !error };
}