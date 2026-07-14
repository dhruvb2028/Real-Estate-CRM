import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { SocialPost } from "@/lib/types";

export async function getSocialPosts(): Promise<SocialPost[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("social_posts")
    .select("*, assignee:profiles!social_posts_assigned_to_fkey(id, full_name, avatar_url)")
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data as unknown as SocialPost[]) ?? [];
}

export async function getSocialTeam(): Promise<{ id: string; full_name: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("is_active", true)
    .in("role", ["social_media_manager", "admin", "sales_manager"])
    .order("full_name");
  return data ?? [];
}
