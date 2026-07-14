import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  ATTENDANCE_STATUS_LABELS,
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
} from "@/lib/constants";
import type {
  AttendanceStatus,
  LeadSource,
  LeadStatus,
} from "@/lib/types";

export interface NameValue {
  name: string;
  value: number;
}

export interface AgentPerformance {
  agent: string;
  calls: number;
  connected: number;
  avgDurationSec: number;
  followupsCompleted: number;
  leadsWon: number;
}

export interface ReportsData {
  leadsBySource: NameValue[];
  leadsByStatus: NameValue[];
  wonLost: { won: number; lost: number; open: number };
  agentPerformance: AgentPerformance[];
  followupsCompleted30d: number;
  propertiesShared30d: number;
  attendanceSummary30d: NameValue[];
}

export async function getReportsData(): Promise<ReportsData> {
  const supabase = await createClient();
  const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

  const [leadsRes, callsRes, followupsRes, sharesRes, attendanceRes, agentsRes] =
    await Promise.all([
      supabase.from("leads").select("source, status, assigned_agent_id").limit(5000),
      supabase
        .from("calls")
        .select("agent_id, status, outcome, duration")
        .gte("created_at", since30)
        .limit(5000),
      supabase
        .from("followups")
        .select("agent_id, status, completed_at")
        .gte("created_at", since30)
        .limit(5000),
      supabase
        .from("lead_property_shares")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since30),
      supabase
        .from("attendance")
        .select("status")
        .gte("work_date", since30.slice(0, 10))
        .limit(5000),
      supabase
        .from("profiles")
        .select("id, full_name")
        .in("role", ["sales_agent", "sales_manager"])
        .eq("is_active", true),
    ]);

  const leads = leadsRes.data ?? [];
  const calls = callsRes.data ?? [];
  const followups = followupsRes.data ?? [];
  const attendance = attendanceRes.data ?? [];
  const agents = agentsRes.data ?? [];

  const tally = <T extends string>(rows: { [k: string]: unknown }[], key: string) => {
    const map = new Map<T, number>();
    for (const r of rows) {
      const v = r[key] as T | null;
      if (!v) continue;
      map.set(v, (map.get(v) ?? 0) + 1);
    }
    return map;
  };

  const sourceMap = tally<LeadSource>(leads, "source");
  const statusMap = tally<LeadStatus>(leads, "status");
  const attMap = tally<AttendanceStatus>(attendance, "status");

  const won = statusMap.get("won") ?? 0;
  const lost = statusMap.get("lost") ?? 0;

  const agentPerformance: AgentPerformance[] = agents
    .map((a) => {
      const myCalls = calls.filter((c) => c.agent_id === a.id);
      const connected = myCalls.filter((c) => c.outcome === "connected");
      const durations = connected
        .map((c) => c.duration ?? 0)
        .filter((d) => d > 0);
      return {
        agent: a.full_name,
        calls: myCalls.length,
        connected: connected.length,
        avgDurationSec: durations.length
          ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
          : 0,
        followupsCompleted: followups.filter(
          (f) => f.agent_id === a.id && f.status === "completed"
        ).length,
        leadsWon: leads.filter(
          (l) => l.assigned_agent_id === a.id && l.status === "won"
        ).length,
      };
    })
    .sort((x, y) => y.calls - x.calls);

  return {
    leadsBySource: [...sourceMap.entries()]
      .map(([k, v]) => ({ name: LEAD_SOURCE_LABELS[k] ?? k, value: v }))
      .sort((a, b) => b.value - a.value),
    leadsByStatus: [...statusMap.entries()]
      .map(([k, v]) => ({ name: LEAD_STATUS_LABELS[k] ?? k, value: v }))
      .sort((a, b) => b.value - a.value),
    wonLost: { won, lost, open: leads.length - won - lost },
    agentPerformance,
    followupsCompleted30d: followups.filter((f) => f.status === "completed").length,
    propertiesShared30d: sharesRes.count ?? 0,
    attendanceSummary30d: [...attMap.entries()].map(([k, v]) => ({
      name: ATTENDANCE_STATUS_LABELS[k] ?? k,
      value: v,
    })),
  };
}
