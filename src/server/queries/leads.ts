import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Activity,
  Call,
  Followup,
  Lead,
  LeadPropertyShare,
  LeadWithAgent,
  Message,
  Profile,
  Property,
} from "@/lib/types";

export interface LeadFilters {
  q?: string;
  status?: string;
  source?: string;
  temperature?: string;
  agent?: string;
  from?: string;
  to?: string;
}

export async function getLeads(filters: LeadFilters): Promise<LeadWithAgent[]> {
  const supabase = await createClient();
  let query = supabase
    .from("leads")
    .select("*, assigned_agent:profiles!leads_assigned_agent_id_fkey(id, full_name, avatar_url)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (filters.q) {
    const q = filters.q.replace(/[%_,]/g, " ").trim();
    if (q) {
      query = query.or(
        `full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%,preferred_location.ilike.%${q}%`
      );
    }
  }
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.source) query = query.eq("source", filters.source);
  if (filters.temperature) query = query.eq("temperature", filters.temperature);
  if (filters.agent) query = query.eq("assigned_agent_id", filters.agent);
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as unknown as LeadWithAgent[]) ?? [];
}

export interface LeadTimelineItem {
  id: string;
  kind: "activity" | "call" | "message" | "followup" | "share";
  at: string;
  data: Activity | Call | Message | Followup | LeadPropertyShare;
}

export interface LeadDetail {
  lead: LeadWithAgent;
  timeline: LeadTimelineItem[];
  shares: (LeadPropertyShare & { property: Pick<Property, "id" | "title"> | null })[];
  pendingFollowups: Followup[];
}

export async function getLeadDetail(id: string): Promise<LeadDetail | null> {
  const supabase = await createClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("*, assigned_agent:profiles!leads_assigned_agent_id_fkey(id, full_name, avatar_url)")
    .eq("id", id)
    .maybeSingle();
  if (!lead) return null;

  const [activities, calls, messages, followups, shares] = await Promise.all([
    supabase
      .from("activities")
      .select("*, actor:profiles(id, full_name, avatar_url)")
      .eq("lead_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("calls").select("*").eq("lead_id", id).order("created_at", { ascending: false }).limit(50),
    supabase.from("messages").select("*").eq("lead_id", id).order("created_at", { ascending: false }).limit(50),
    supabase.from("followups").select("*").eq("lead_id", id).order("created_at", { ascending: false }).limit(50),
    supabase
      .from("lead_property_shares")
      .select("*, property:properties(id, title)")
      .eq("lead_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const timeline: LeadTimelineItem[] = [
    ...((activities.data ?? []) as Activity[]).map((a) => ({
      id: `a-${a.id}`,
      kind: "activity" as const,
      at: a.created_at,
      data: a,
    })),
    ...((calls.data ?? []) as Call[]).map((c) => ({
      id: `c-${c.id}`,
      kind: "call" as const,
      at: c.created_at,
      data: c,
    })),
    ...((messages.data ?? []) as Message[]).map((m) => ({
      id: `m-${m.id}`,
      kind: "message" as const,
      at: m.created_at,
      data: m,
    })),
    ...((followups.data ?? []) as Followup[]).map((f) => ({
      id: `f-${f.id}`,
      kind: "followup" as const,
      at: f.created_at,
      data: f,
    })),
  ].sort((x, y) => (x.at < y.at ? 1 : -1));

  return {
    lead: lead as unknown as LeadWithAgent,
    timeline,
    shares: (shares.data ?? []) as LeadDetail["shares"],
    pendingFollowups: ((followups.data ?? []) as Followup[]).filter(
      (f) => f.status === "pending"
    ),
  };
}

export async function getAgents(): Promise<Pick<Profile, "id" | "full_name" | "role">[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("is_active", true)
    .in("role", ["sales_agent", "sales_manager", "admin"])
    .order("full_name");
  return data ?? [];
}

/** Properties matching a lead's budget/location/type, for "Recommended". */
export async function getRecommendedProperties(lead: Lead): Promise<Property[]> {
  const supabase = await createClient();
  let query = supabase
    .from("properties")
    .select("*, property_images(url, is_cover, sort_order)")
    .eq("availability", "available")
    .limit(6);

  if (lead.property_type) query = query.eq("property_type", lead.property_type);
  // Budget window with 20% headroom on both sides
  if (lead.budget_max) query = query.lte("price", Math.round(lead.budget_max * 1.2));
  if (lead.budget_min) query = query.gte("price", Math.round(lead.budget_min * 0.8));

  const { data } = await query;
  let results = (data as unknown as Property[]) ?? [];

  // Soft-rank by location match instead of hard filtering
  if (lead.preferred_location) {
    const loc = lead.preferred_location.toLowerCase();
    results = [...results].sort((a, b) => {
      const am = a.location.toLowerCase().includes(loc) ? 0 : 1;
      const bm = b.location.toLowerCase().includes(loc) ? 0 : 1;
      return am - bm;
    });
  }
  return results;
}
