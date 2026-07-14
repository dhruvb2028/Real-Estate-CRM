import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Followup } from "@/lib/types";

export interface FollowupGroups {
  overdue: Followup[];
  today: Followup[];
  upcoming: Followup[];
  completed: Followup[];
}

export async function getFollowups(agentId?: string): Promise<FollowupGroups> {
  const supabase = await createClient();
  let query = supabase
    .from("followups")
    .select("*, lead:leads(id, full_name, phone, preferred_location, temperature)")
    .order("due_at", { ascending: true })
    .limit(300);
  if (agentId) query = query.eq("agent_id", agentId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data as unknown as Followup[]) ?? [];

  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const pending = rows.filter((f) => f.status === "pending" || f.status === "snoozed");

  return {
    overdue: pending.filter((f) => new Date(f.due_at) < now),
    today: pending.filter(
      (f) => new Date(f.due_at) >= now && new Date(f.due_at) <= endOfDay
    ),
    upcoming: pending.filter((f) => new Date(f.due_at) > endOfDay),
    completed: rows
      .filter((f) => f.status === "completed" && f.completed_at)
      .sort((a, b) => (a.completed_at! < b.completed_at! ? 1 : -1))
      .slice(0, 50),
  };
}
