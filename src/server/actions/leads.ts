"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, requireProfile } from "@/lib/supabase/server";
import { leadAssignmentService } from "@/services/leadAssignmentService";
import { callService } from "@/services/callService";
import { messageService } from "@/services/messageService";
import { emailService } from "@/services/emailService";
import { propertyShareService } from "@/services/propertyShareService";
import { notificationService } from "@/services/notificationService";
import { leadFormSchema, messageChannelEnum } from "@/lib/validations";
import {
  FOLLOWUP_TEMPLATES,
  LEAD_STATUS_LABELS,
  renderTemplate,
} from "@/lib/constants";
import type { ActionState, Lead, LeadStatus, LeadTemperature } from "@/lib/types";

export async function createLead(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireProfile();
  const parsed = leadFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  const supabase = await createClient();
  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      organization_id: profile.organization_id,
      full_name: d.fullName,
      phone: d.phone,
      email: d.email || null,
      source: d.source,
      property_type: d.propertyType || null,
      budget_min: d.budgetMin === "" || d.budgetMin === undefined ? null : d.budgetMin,
      budget_max: d.budgetMax === "" || d.budgetMax === undefined ? null : d.budgetMax,
      preferred_location: d.preferredLocation || null,
      temperature: d.temperature,
      assigned_agent_id: d.assignedAgentId || null,
      notes: d.notes || null,
      next_followup_at: d.nextFollowupAt ? new Date(d.nextFollowupAt).toISOString() : null,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error || !lead) return { ok: false, error: error?.message ?? "Failed to create lead" };

  await supabase.from("activities").insert({
    organization_id: profile.organization_id,
    lead_id: lead.id,
    actor_id: profile.id,
    type: "lead_created",
    title: "Lead created",
    description: `Added manually by ${profile.full_name}`,
  });

  if (!d.assignedAgentId) {
    await leadAssignmentService.assign(profile.organization_id!, lead.id);
  } else {
    await notificationService.notify({
      orgId: profile.organization_id!,
      userId: d.assignedAgentId,
      type: "new_lead_assigned",
      title: "New lead assigned",
      body: d.fullName,
      link: `/leads/${lead.id}`,
    });
  }

  if (d.autoCall) {
    // Fire the instant bridge (dry-run simulates); don't block the redirect on it.
    void callService.initiateBridge(profile.organization_id!, lead.id).catch(() => {});
  }

  revalidatePath("/leads");
  redirect(`/leads/${lead.id}`);
}

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus
): Promise<ActionState> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase.from("leads").update({ status }).eq("id", leadId);
  if (error) return { ok: false, error: error.message };

  await supabase.from("activities").insert({
    organization_id: profile.organization_id,
    lead_id: leadId,
    actor_id: profile.id,
    type: "status_changed",
    title: `Status → ${LEAD_STATUS_LABELS[status]}`,
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  return { ok: true };
}

export async function updateLeadTemperature(
  leadId: string,
  temperature: LeadTemperature
): Promise<ActionState> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase.from("leads").update({ temperature }).eq("id", leadId);
  if (error) return { ok: false, error: error.message };

  await supabase.from("activities").insert({
    organization_id: profile.organization_id,
    lead_id: leadId,
    actor_id: profile.id,
    type: "temperature_changed",
    title: `Marked ${temperature} lead`,
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  return { ok: true };
}

export async function assignLeadAgent(
  leadId: string,
  agentId: string
): Promise<ActionState> {
  const profile = await requireProfile();
  if (!["admin", "sales_manager"].includes(profile.role)) {
    return { ok: false, error: "Only managers can reassign leads" };
  }
  const supabase = await createClient();

  const { error } = await supabase
    .from("leads")
    .update({ assigned_agent_id: agentId })
    .eq("id", leadId);
  if (error) return { ok: false, error: error.message };

  const { data: agent } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", agentId)
    .single();

  await supabase.from("activities").insert({
    organization_id: profile.organization_id,
    lead_id: leadId,
    actor_id: profile.id,
    type: "lead_assigned",
    title: `Assigned to ${agent?.full_name ?? "agent"}`,
  });

  await notificationService.notify({
    orgId: profile.organization_id!,
    userId: agentId,
    type: "new_lead_assigned",
    title: "Lead assigned to you",
    link: `/leads/${leadId}`,
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  return { ok: true };
}

export async function addLeadNote(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireProfile();
  const leadId = formData.get("leadId") as string;
  const note = (formData.get("note") as string)?.trim();
  if (!leadId || !note) return { ok: false, error: "Note cannot be empty" };
  if (note.length > 2000) return { ok: false, error: "Note is too long" };

  const supabase = await createClient();
  const { error } = await supabase.from("activities").insert({
    organization_id: profile.organization_id,
    lead_id: leadId,
    actor_id: profile.id,
    type: "note_added",
    title: "Note",
    description: note,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/leads/${leadId}`);
  return { ok: true, message: "Note added" };
}

/** One-click bridge call: rings the agent, then the lead, and bridges. */
export async function triggerBridgeCall(leadId: string): Promise<ActionState> {
  const profile = await requireProfile();
  const result = await callService.initiateBridge(profile.organization_id!, leadId);
  revalidatePath(`/leads/${leadId}`);
  if (!result.ok) return { ok: false, error: result.error };
  return {
    ok: true,
    message: result.dryRun
      ? "Bridge call simulated (dry-run mode) — check the timeline"
      : "Bridge call started — your phone will ring shortly",
  };
}

/** One-click follow-up message over WhatsApp/SMS/email using a template. */
export async function sendLeadMessage(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireProfile();
  const leadId = formData.get("leadId") as string;
  const channelParse = messageChannelEnum.safeParse(formData.get("channel"));
  const templateKey = formData.get("templateKey") as string;
  const customBody = ((formData.get("body") as string) ?? "").trim();

  if (!leadId || !channelParse.success) return { ok: false, error: "Invalid request" };
  const channel = channelParse.data;

  const supabase = await createClient();
  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single();
  if (!lead) return { ok: false, error: "Lead not found" };
  const l = lead as Lead;

  let body = customBody;
  if (!body) {
    const template = FOLLOWUP_TEMPLATES.find((t) => t.key === templateKey);
    if (!template) return { ok: false, error: "Pick a template or write a message" };
    body = renderTemplate(template.body, {
      leadName: l.full_name,
      preferredLocation: l.preferred_location ?? "your preferred area",
      agentName: profile.full_name,
    });
  }
  if (body.length > 3000) return { ok: false, error: "Message is too long" };

  let result;
  if (channel === "email") {
    if (!l.email) return { ok: false, error: "This lead has no email address" };
    result = await emailService.send({
      orgId: profile.organization_id!,
      leadId,
      senderId: profile.id,
      to: l.email,
      subject: "Following up on your property search",
      body,
      templateKey: templateKey || undefined,
    });
  } else {
    result = await messageService.send({
      orgId: profile.organization_id!,
      leadId,
      senderId: profile.id,
      channel,
      to: l.phone,
      body,
      templateKey: templateKey || undefined,
    });
  }
  if (!result.ok) return { ok: false, error: result.error };

  await supabase.from("activities").insert({
    organization_id: profile.organization_id,
    lead_id: leadId,
    actor_id: profile.id,
    type: "message_sent",
    title: `${channel === "email" ? "Email" : channel === "sms" ? "SMS" : "WhatsApp"} sent`,
    description: body.slice(0, 200),
    metadata: { dry_run: !!result.dryRun },
  });
  await supabase
    .from("leads")
    .update({ last_contacted_at: new Date().toISOString() })
    .eq("id", leadId);

  revalidatePath(`/leads/${leadId}`);
  return {
    ok: true,
    message: result.dryRun ? "Message simulated (dry-run mode)" : "Message sent",
  };
}

/** One-click property share to a lead. */
export async function sharePropertyWithLead(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireProfile();
  const leadId = formData.get("leadId") as string;
  const propertyId = formData.get("propertyId") as string;
  const channelParse = messageChannelEnum.safeParse(formData.get("channel"));
  if (!leadId || !propertyId || !channelParse.success) {
    return { ok: false, error: "Pick a property and channel" };
  }

  const result = await propertyShareService.share({
    orgId: profile.organization_id!,
    leadId,
    propertyId,
    sharedBy: profile.id,
    channel: channelParse.data,
    customMessage: (formData.get("message") as string) || undefined,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath(`/leads/${leadId}`);
  return {
    ok: true,
    message: result.dryRun
      ? "Property share simulated (dry-run mode)"
      : "Property details sent",
  };
}

interface ImportRow {
  fullName: string;
  phone: string;
  email?: string;
  source?: string;
  propertyType?: string;
  budgetMin?: number;
  budgetMax?: number;
  preferredLocation?: string;
  notes?: string;
}

/** Bulk CSV import — inserts rows and round-robin assigns unowned leads. */
export async function importLeads(
  rowsJson: string,
  autoAssign: boolean
): Promise<ActionState & { imported?: number; skipped?: number }> {
  const profile = await requireProfile();
  if (!["admin", "sales_manager"].includes(profile.role)) {
    return { ok: false, error: "Only managers can bulk import leads" };
  }

  let rows: ImportRow[];
  try {
    rows = JSON.parse(rowsJson);
  } catch {
    return { ok: false, error: "Invalid import data" };
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, error: "No rows to import" };
  }
  if (rows.length > 500) return { ok: false, error: "Max 500 rows per import" };

  const { normalizeSource, normalizePropertyType } = await import("@/lib/validations");
  const supabase = await createClient();

  let imported = 0;
  let skipped = 0;
  const insertedIds: string[] = [];

  for (const row of rows) {
    const fullName = (row.fullName ?? "").trim();
    const phone = (row.phone ?? "").trim();
    if (fullName.length < 2 || phone.length < 7) {
      skipped++;
      continue;
    }
    const { data: lead, error } = await supabase
      .from("leads")
      .insert({
        organization_id: profile.organization_id,
        full_name: fullName.slice(0, 120),
        phone: phone.slice(0, 20),
        email: row.email?.trim() || null,
        source: normalizeSource(row.source),
        source_detail: row.source ?? null,
        property_type: normalizePropertyType(row.propertyType),
        budget_min: row.budgetMin || null,
        budget_max: row.budgetMax || null,
        preferred_location: row.preferredLocation?.trim().slice(0, 200) || null,
        notes: row.notes?.trim().slice(0, 2000) || null,
        created_by: profile.id,
      })
      .select("id")
      .single();
    if (error || !lead) {
      skipped++;
      continue;
    }
    insertedIds.push(lead.id);
    imported++;
  }

  await supabase.from("activities").insert(
    insertedIds.map((id) => ({
      organization_id: profile.organization_id,
      lead_id: id,
      actor_id: profile.id,
      type: "lead_created" as const,
      title: "Lead imported",
      description: `CSV import by ${profile.full_name}`,
    }))
  );

  if (autoAssign) {
    for (const id of insertedIds) {
      await leadAssignmentService.assign(profile.organization_id!, id);
    }
  }

  revalidatePath("/leads");
  return {
    ok: true,
    imported,
    skipped,
    message: `Imported ${imported} lead(s)${skipped ? `, skipped ${skipped}` : ""}`,
  };
}

export async function deleteLead(leadId: string): Promise<ActionState> {
  const profile = await requireProfile();
  if (!["admin", "sales_manager"].includes(profile.role)) {
    return { ok: false, error: "Only managers can delete leads" };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("leads").delete().eq("id", leadId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/leads");
  redirect("/leads");
}
