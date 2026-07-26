import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, requireProfile } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { IntegrationsForm } from "./integrations-form";
import type { IntegrationSettings } from "@/lib/types";
import type { SafeIntegrationSettings } from "./integrations-form";

export const metadata: Metadata = { title: "Integrations" };
export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/settings");

  const supabase = await createClient();
  const { data } = await supabase
    .from("integration_settings")
    .select("*")
    .eq("organization_id", profile.organization_id!)
    .maybeSingle();

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

  // Secrets are never sent to the browser — only whether each one is configured.
  const row = (data as IntegrationSettings | null) ?? null;
  const safeSettings: SafeIntegrationSettings | null = row
    ? {
        twilio_account_sid: row.twilio_account_sid,
        twilio_phone_number: row.twilio_phone_number,
        whatsapp_sender: row.whatsapp_sender,
        lead_webhook_secret: row.lead_webhook_secret,
        openai_base_url: row.openai_base_url,
        social_webhook_url: row.social_webhook_url,
        default_assignment_mode: row.default_assignment_mode,
        dry_run: row.dry_run,
        whatsapp_mode: row.whatsapp_mode ?? "deep_link",
        hasTwilioAuthToken: !!row.twilio_auth_token,
        hasResendApiKey: !!row.resend_api_key,
        hasOpenaiApiKey: !!row.openai_api_key,
      }
    : null;

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Integrations"
        description="Connect Twilio, WhatsApp, email, AI and lead sources"
      />
      <IntegrationsForm
        settings={safeSettings}
        webhookEndpoint={`${appUrl}/api/webhooks/leads`}
        orgId={profile.organization_id!}
      />
    </div>
  );
}
