import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationType, ServiceResult, UserRole } from "@/lib/types";

interface NotifyInput {
  orgId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}

export const notificationService = {
  async notify(input: NotifyInput): Promise<ServiceResult> {
    const admin = createAdminClient();
    const { error } = await admin.from("notifications").insert({
      organization_id: input.orgId,
      user_id: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },

  /** Notify every active user in the org holding one of the given roles. */
  async notifyRoles(
    orgId: string,
    roles: UserRole[],
    payload: Omit<NotifyInput, "orgId" | "userId">
  ): Promise<ServiceResult> {
    const admin = createAdminClient();
    const { data: users, error } = await admin
      .from("profiles")
      .select("id")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .in("role", roles);
    if (error) return { ok: false, error: error.message };
    if (!users?.length) return { ok: true };

    const rows = users.map((u) => ({
      organization_id: orgId,
      user_id: u.id,
      type: payload.type,
      title: payload.title,
      body: payload.body ?? null,
      link: payload.link ?? null,
    }));
    const { error: insErr } = await admin.from("notifications").insert(rows);
    if (insErr) return { ok: false, error: insErr.message };
    return { ok: true };
  },
};
