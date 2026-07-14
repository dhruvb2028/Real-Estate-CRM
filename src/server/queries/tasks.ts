import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CrmTask, Profile } from "@/lib/types";

export interface TaskWithRelations extends CrmTask {
  lead: { id: string; full_name: string } | null;
  property: { id: string; title: string } | null;
  assignee: Pick<Profile, "id" | "full_name"> | null;
}

export async function getTasks(assignedTo?: string): Promise<TaskWithRelations[]> {
  const supabase = await createClient();
  let query = supabase
    .from("tasks")
    .select(
      "*, lead:leads(id, full_name), property:properties(id, title), assignee:profiles!tasks_assigned_to_fkey(id, full_name)"
    )
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(200);
  if (assignedTo) query = query.eq("assigned_to", assignedTo);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as unknown as TaskWithRelations[]) ?? [];
}

export async function getAssignableMembers(): Promise<
  Pick<Profile, "id" | "full_name" | "role">[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("is_active", true)
    .order("full_name");
  return data ?? [];
}
