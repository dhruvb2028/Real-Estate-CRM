import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResolvedConfig } from "@/services/config";
import { notificationService } from "@/services/notificationService";
import type { ServiceResult } from "@/lib/types";

/**
 * Picks an agent for a lead per the org's assignment mode and assigns it.
 * round_robin  → least-recently-assigned active sales agent (DB function)
 * least_busy   → fewest open leads (DB function)
 * manual       → leave unassigned; managers assign from the UI
 */
export const leadAssignmentService = {
  async assign(
    orgId: string,
    leadId: string,
    opts?: { excludeAgentIds?: string[] }
  ): Promise<ServiceResult<{ agentId: string | null }>> {
    const admin = createAdminClient();
    const config = await getResolvedConfig(orgId);

    if (config.assignmentMode === "manual") {
      return { ok: true, data: { agentId: null } };
    }

    let agentId: string | null = null;

    if (opts?.excludeAgentIds?.length) {
      // Fallback path (e.g. bridge retry): pick the next eligible agent inline.
      const { data: agents } = await admin
        .from("profiles")
        .select("id, last_assigned_at")
        .eq("organization_id", orgId)
        .eq("role", "sales_agent")
        .eq("is_active", true)
        .not("id", "in", `(${opts.excludeAgentIds.join(",")})`)
        .order("last_assigned_at", { ascending: true, nullsFirst: true })
        .limit(1);
      agentId = agents?.[0]?.id ?? null;
      if (agentId) {
        await admin
          .from("profiles")
          .update({ last_assigned_at: new Date().toISOString() })
          .eq("id", agentId);
      }
    } else {
      const fn =
        config.assignmentMode === "least_busy"
          ? "next_least_busy_agent"
          : "next_round_robin_agent";
      const { data, error } = await admin.rpc(fn, { p_org: orgId });
      if (error) return { ok: false, error: error.message };
      agentId = (data as string | null) ?? null;
    }

    if (!agentId) return { ok: true, data: { agentId: null } };

    const { error: updErr } = await admin
      .from("leads")
      .update({ assigned_agent_id: agentId })
      .eq("id", leadId)
      .eq("organization_id", orgId);
    if (updErr) return { ok: false, error: updErr.message };

    const { data: lead } = await admin
      .from("leads")
      .select("full_name, source")
      .eq("id", leadId)
      .single();

    await admin.from("activities").insert({
      organization_id: orgId,
      lead_id: leadId,
      type: "lead_assigned",
      title: "Lead assigned",
      description: `Assigned automatically (${config.assignmentMode.replace("_", " ")})`,
      metadata: { agent_id: agentId },
    });

    await notificationService.notify({
      orgId,
      userId: agentId,
      type: "new_lead_assigned",
      title: "New lead assigned",
      body: lead ? `${lead.full_name} (${lead.source})` : undefined,
      link: `/leads/${leadId}`,
    });

    return { ok: true, data: { agentId } };
  },
};
