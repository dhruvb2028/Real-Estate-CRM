import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Activity } from "@/lib/types";

export interface DashboardStats {
  newLeadsToday: number;
  callsToday: number;
  followupsDueToday: number;
  hotLeads: number;
  siteVisits: number;
  availableInventory: number;
  checkedInToday: number;
  teamSize: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const today = now.toISOString().slice(0, 10);

  const count = (q: PromiseLike<{ count: number | null }>) =>
    q.then((r) => r.count ?? 0);

  const [
    newLeadsToday,
    callsToday,
    followupsDueToday,
    hotLeads,
    siteVisits,
    availableInventory,
    checkedInToday,
    teamSize,
  ] = await Promise.all([
    count(
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfDay.toISOString())
    ),
    count(
      supabase
        .from("calls")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfDay.toISOString())
    ),
    count(
      supabase
        .from("followups")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .lte("due_at", endOfDay.toISOString())
    ),
    count(
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("temperature", "hot")
        .not("status", "in", "(won,lost)")
    ),
    count(
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("status", "site_visit_scheduled")
    ),
    count(
      supabase
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("availability", "available")
    ),
    count(
      supabase
        .from("attendance")
        .select("id", { count: "exact", head: true })
        .eq("work_date", today)
        .not("check_in_time", "is", null)
    ),
    count(
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
    ),
  ]);

  return {
    newLeadsToday,
    callsToday,
    followupsDueToday,
    hotLeads,
    siteVisits,
    availableInventory,
    checkedInToday,
    teamSize,
  };
}

export async function getRecentActivity(): Promise<Activity[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activities")
    .select("*, actor:profiles(id, full_name, avatar_url)")
    .order("created_at", { ascending: false })
    .limit(15);
  return (data as unknown as Activity[]) ?? [];
}
