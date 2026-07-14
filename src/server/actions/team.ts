"use server";

import { revalidatePath } from "next/cache";
import { createClient, requireProfile } from "@/lib/supabase/server";
import { emailService } from "@/services/emailService";
import { inviteCreateSchema } from "@/lib/validations";
import { ROLE_LABELS } from "@/lib/constants";
import type { ActionState, UserRole } from "@/lib/types";

export async function inviteTeamMember(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState & { inviteUrl?: string }> {
  const profile = await requireProfile();
  if (profile.role !== "admin") {
    return { ok: false, error: "Only admins can invite team members" };
  }

  const parsed = inviteCreateSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", parsed.data.email)
    .maybeSingle();
  if (existing) return { ok: false, error: "This email is already on your team" };

  const { data: invite, error } = await supabase
    .from("team_members")
    .insert({
      organization_id: profile.organization_id,
      email: parsed.data.email,
      role: parsed.data.role,
      invited_by: profile.id,
    })
    .select("token")
    .single();
  if (error || !invite) return { ok: false, error: error?.message ?? "Failed to invite" };

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const inviteUrl = `${appUrl}/invite/${invite.token}`;

  // Email the invite (dry-run logs it); the URL is also surfaced in the UI to copy.
  await emailService.send({
    orgId: profile.organization_id!,
    to: parsed.data.email,
    subject: `You're invited to join ${profile.full_name}'s team on EstateFlow CRM`,
    body: `Hi,\n\nYou've been invited as ${ROLE_LABELS[parsed.data.role]}.\n\nAccept your invite: ${inviteUrl}\n\nThis link expires in 7 days.`,
  });

  revalidatePath("/team");
  return { ok: true, message: "Invite created", inviteUrl };
}

export async function revokeInvite(inviteId: string): Promise<ActionState> {
  const profile = await requireProfile();
  if (profile.role !== "admin") return { ok: false, error: "Admins only" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("team_members")
    .update({ status: "revoked" })
    .eq("id", inviteId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/team");
  return { ok: true, message: "Invite revoked" };
}

export async function updateMemberRole(
  memberId: string,
  role: UserRole
): Promise<ActionState> {
  const profile = await requireProfile();
  if (profile.role !== "admin") return { ok: false, error: "Admins only" };
  if (memberId === profile.id) return { ok: false, error: "You can't change your own role" };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", memberId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/team");
  return { ok: true, message: "Role updated" };
}

export async function toggleMemberActive(
  memberId: string,
  isActive: boolean
): Promise<ActionState> {
  const profile = await requireProfile();
  if (profile.role !== "admin") return { ok: false, error: "Admins only" };
  if (memberId === profile.id) return { ok: false, error: "You can't deactivate yourself" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", memberId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/team");
  return { ok: true, message: isActive ? "Member activated" : "Member deactivated" };
}
