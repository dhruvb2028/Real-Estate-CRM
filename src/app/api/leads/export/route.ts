import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS } from "@/lib/constants";
import type { Lead, LeadSource, LeadStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** GET /api/leads/export — CSV of the current org's leads (RLS-scoped). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("leads")
    .select("*, assigned_agent:profiles!leads_assigned_agent_id_fkey(full_name)")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const header = [
    "Full Name", "Phone", "Email", "Source", "Status", "Temperature",
    "Property Type", "Budget Min", "Budget Max", "Preferred Location",
    "Assigned Agent", "Notes", "Next Follow-up", "Last Contacted", "Created",
  ];

  const rows = ((data ?? []) as (Lead & { assigned_agent: { full_name: string } | null })[]).map(
    (l) =>
      [
        l.full_name,
        l.phone,
        l.email,
        LEAD_SOURCE_LABELS[l.source as LeadSource] ?? l.source,
        LEAD_STATUS_LABELS[l.status as LeadStatus] ?? l.status,
        l.temperature,
        l.property_type,
        l.budget_min,
        l.budget_max,
        l.preferred_location,
        l.assigned_agent?.full_name,
        l.notes,
        l.next_followup_at,
        l.last_contacted_at,
        l.created_at,
      ]
        .map(csvEscape)
        .join(",")
  );

  const csv = [header.join(","), ...rows].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="estateflow-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
