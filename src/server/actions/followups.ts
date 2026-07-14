"use server";

import { revalidatePath } from "next/cache";
import { createClient, requireProfile } from "@/lib/supabase/server";
import { followupFormSchema } from "@/lib/validations";
import type { ActionState } from "@/lib/types";

export async function scheduleFollowup(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireProfile();
  const parsed = followupFormSchema.safeParse({
    leadId: formData.get("leadId"),
    type: formData.get("type"),
    dueAt: formData.get("dueAt"),
    notes: formData.get("notes"),
    templateKey: formData.get("templateKey") ?? undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  const dueAtISO = new Date(d.dueAt).toISOString();

  const supabase = await createClient();
  const { error } = await supabase.from("followups").insert({
    organization_id: profile.organization_id,
    lead_id: d.leadId,
    agent_id: profile.id,
    type: d.type,
    notes: d.notes || null,
    template_key: d.templateKey || null,
    due_at: dueAtISO,
    status: "pending",
  });
  if (error) return { ok: false, error: error.message };

  await Promise.all([
    supabase
      .from("leads")
      .update({ next_followup_at: dueAtISO })
      .eq("id", d.leadId),
    supabase.from("activities").insert({
      organization_id: profile.organization_id,
      lead_id: d.leadId,
      actor_id: profile.id,
      type: "followup_scheduled",
      title: `Follow-up scheduled (${d.type.replace("_", " ")})`,
      description: d.notes || null,
    }),
  ]);

  revalidatePath(`/leads/${d.leadId}`);
  revalidatePath("/followups");
  return { ok: true, message: "Follow-up scheduled" };
}

export async function completeFollowup(followupId: string): Promise<ActionState> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: followup, error } = await supabase
    .from("followups")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", followupId)
    .select("lead_id")
    .single();
  if (error) return { ok: false, error: error.message };

  await supabase.from("activities").insert({
    organization_id: profile.organization_id,
    lead_id: followup.lead_id,
    actor_id: profile.id,
    type: "followup_completed",
    title: "Follow-up completed",
  });

  revalidatePath("/followups");
  revalidatePath(`/leads/${followup.lead_id}`);
  return { ok: true, message: "Follow-up marked complete" };
}

export async function snoozeFollowup(
  followupId: string,
  hours: number
): Promise<ActionState> {
  await requireProfile();
  const supabase = await createClient();

  const { data: current } = await supabase
    .from("followups")
    .select("due_at, lead_id")
    .eq("id", followupId)
    .single();
  if (!current) return { ok: false, error: "Follow-up not found" };

  const base = new Date(current.due_at) < new Date() ? new Date() : new Date(current.due_at);
  const newDue = new Date(base.getTime() + hours * 3600 * 1000).toISOString();

  const { error } = await supabase
    .from("followups")
    .update({ status: "pending", due_at: newDue, snoozed_until: newDue })
    .eq("id", followupId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/followups");
  revalidatePath(`/leads/${current.lead_id}`);
  return { ok: true, message: `Snoozed ${hours >= 24 ? "to tomorrow" : `${hours}h`}` };
}

export async function cancelFollowup(followupId: string): Promise<ActionState> {
  await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("followups")
    .update({ status: "cancelled" })
    .eq("id", followupId)
    .select("lead_id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/followups");
  if (data) revalidatePath(`/leads/${data.lead_id}`);
  return { ok: true };
}
