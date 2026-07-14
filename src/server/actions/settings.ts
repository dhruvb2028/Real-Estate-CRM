"use server";

import { revalidatePath } from "next/cache";
import { createClient, requireProfile } from "@/lib/supabase/server";
import { integrationSettingsSchema } from "@/lib/validations";
import type { ActionState } from "@/lib/types";

export async function updateProfile(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireProfile();
  const fullName = ((formData.get("fullName") as string) ?? "").trim();
  const phone = ((formData.get("phone") as string) ?? "").trim();
  if (fullName.length < 2) return { ok: false, error: "Enter your full name" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone: phone || null })
    .eq("id", profile.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile updated" };
}

export async function updateOrganization(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireProfile();
  if (profile.role !== "admin") return { ok: false, error: "Admins only" };

  const name = ((formData.get("name") as string) ?? "").trim();
  if (name.length < 2) return { ok: false, error: "Enter your business name" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      name,
      phone: ((formData.get("phone") as string) ?? "").trim() || null,
      email: ((formData.get("email") as string) ?? "").trim() || null,
      address: ((formData.get("address") as string) ?? "").trim() || null,
      work_start_time: ((formData.get("workStartTime") as string) ?? "").trim() || null,
    })
    .eq("id", profile.organization_id!);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true, message: "Workspace updated" };
}

export async function saveIntegrationSettings(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireProfile();
  if (profile.role !== "admin") return { ok: false, error: "Admins only" };

  const parsed = integrationSettingsSchema.safeParse({
    twilioAccountSid: formData.get("twilioAccountSid") ?? "",
    twilioAuthToken: formData.get("twilioAuthToken") ?? "",
    twilioPhoneNumber: formData.get("twilioPhoneNumber") ?? "",
    whatsappSender: formData.get("whatsappSender") ?? "",
    resendApiKey: formData.get("resendApiKey") ?? "",
    leadWebhookSecret: formData.get("leadWebhookSecret"),
    openaiApiKey: formData.get("openaiApiKey") ?? "",
    openaiBaseUrl: formData.get("openaiBaseUrl") ?? "",
    socialWebhookUrl: formData.get("socialWebhookUrl") ?? "",
    defaultAssignmentMode: formData.get("defaultAssignmentMode"),
    dryRun: formData.get("dryRun") === "true" || formData.get("dryRun") === "on",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("integration_settings")
    .upsert(
      {
        organization_id: profile.organization_id,
        twilio_account_sid: d.twilioAccountSid || null,
        twilio_auth_token: d.twilioAuthToken || null,
        twilio_phone_number: d.twilioPhoneNumber || null,
        whatsapp_sender: d.whatsappSender || null,
        resend_api_key: d.resendApiKey || null,
        lead_webhook_secret: d.leadWebhookSecret,
        openai_api_key: d.openaiApiKey || null,
        openai_base_url: d.openaiBaseUrl || null,
        social_webhook_url: d.socialWebhookUrl || null,
        default_assignment_mode: d.defaultAssignmentMode,
        dry_run: d.dryRun,
      },
      { onConflict: "organization_id" }
    );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings/integrations");
  return { ok: true, message: "Integration settings saved" };
}
