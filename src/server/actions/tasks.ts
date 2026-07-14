"use server";

import { revalidatePath } from "next/cache";
import { createClient, requireProfile } from "@/lib/supabase/server";
import { notificationService } from "@/services/notificationService";
import type { ActionState, TaskStatus } from "@/lib/types";

export async function createTask(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireProfile();
  const title = ((formData.get("title") as string) ?? "").trim();
  const taskType = (formData.get("taskType") as string) || "general";
  const leadId = (formData.get("leadId") as string) || null;
  const propertyId = (formData.get("propertyId") as string) || null;
  const assignedTo = (formData.get("assignedTo") as string) || null;
  const dueAt = (formData.get("dueAt") as string) || null;
  const description = ((formData.get("description") as string) ?? "").trim() || null;

  if (title.length < 2) return { ok: false, error: "Give the task a title" };
  if (!["general", "site_visit", "call", "followup"].includes(taskType)) {
    return { ok: false, error: "Invalid task type" };
  }

  const supabase = await createClient();
  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      organization_id: profile.organization_id,
      title,
      description,
      task_type: taskType,
      lead_id: leadId,
      property_id: propertyId,
      assigned_to: assignedTo,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error || !task) return { ok: false, error: error?.message ?? "Failed to create task" };

  if (taskType === "site_visit" && leadId) {
    await supabase
      .from("leads")
      .update({ status: "site_visit_scheduled" })
      .eq("id", leadId);
    await supabase.from("activities").insert({
      organization_id: profile.organization_id,
      lead_id: leadId,
      actor_id: profile.id,
      type: "site_visit",
      title: "Site visit scheduled",
      description: dueAt
        ? `Scheduled for ${new Date(dueAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`
        : title,
    });
  }

  if (assignedTo && assignedTo !== profile.id) {
    await notificationService.notify({
      orgId: profile.organization_id!,
      userId: assignedTo,
      type: taskType === "site_visit" ? "site_visit_scheduled" : "general",
      title: taskType === "site_visit" ? "Site visit assigned" : "Task assigned",
      body: title,
      link: "/tasks",
    });
  }

  revalidatePath("/tasks");
  if (leadId) revalidatePath(`/leads/${leadId}`);
  return { ok: true, message: "Task created" };
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  visitNotes?: string
): Promise<ActionState> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const updates: Record<string, unknown> = { status };
  if (status === "completed") updates.completed_at = new Date().toISOString();
  if (visitNotes?.trim()) updates.visit_notes = visitNotes.trim();

  const { data: task, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", taskId)
    .select("lead_id, task_type, title")
    .single();
  if (error) return { ok: false, error: error.message };

  if (status === "completed" && task?.lead_id && task.task_type === "site_visit") {
    await supabase.from("activities").insert({
      organization_id: profile.organization_id,
      lead_id: task.lead_id,
      actor_id: profile.id,
      type: "site_visit",
      title: "Site visit completed",
      description: visitNotes?.trim() || task.title,
    });
  }

  revalidatePath("/tasks");
  if (task?.lead_id) revalidatePath(`/leads/${task.lead_id}`);
  return { ok: true, message: status === "completed" ? "Task completed" : "Task updated" };
}
