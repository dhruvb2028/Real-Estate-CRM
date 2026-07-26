import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/security/crypto";
import { brand } from "@/lib/brand";
import type { AssignmentMode, IntegrationSettings, WhatsappMode } from "@/lib/types";

/**
 * Resolved integration configuration for one organization.
 * Precedence: integration_settings row (set in the admin UI) → env var.
 * An integration runs in dry-run mode when DRY_RUN=true, when the org's
 * dry_run flag is on, or when that integration's keys are missing.
 */
export interface ResolvedConfig {
  orgId: string;
  appUrl: string;
  forceDryRun: boolean;
  twilio: {
    accountSid: string | null;
    authToken: string | null;
    phoneNumber: string | null;
    whatsappNumber: string | null;
    enabled: boolean;
  };
  email: {
    resendApiKey: string | null;
    from: string;
    enabled: boolean;
  };
  ai: {
    apiKey: string | null;
    baseUrl: string;
    model: string;
    enabled: boolean;
  };
  webhookSecret: string | null;
  socialWebhookUrl: string | null;
  assignmentMode: AssignmentMode;
  /** deep_link works with no Meta verification; api needs a verified sender. */
  whatsappMode: WhatsappMode;
}

/** Sender domain derived from the deployment URL, e.g. crm.client.com. */
function emailDomain(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").hostname;
  } catch {
    return "localhost";
  }
}

function envBool(v: string | undefined, fallback = false): boolean {
  if (v === undefined || v === "") return fallback;
  return ["1", "true", "yes"].includes(v.toLowerCase());
}

export async function getResolvedConfig(orgId: string): Promise<ResolvedConfig> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("integration_settings")
    .select("*")
    .eq("organization_id", orgId)
    .maybeSingle();

  const s = (data as IntegrationSettings | null) ?? null;

  // DB values are encrypted at rest; env vars are already plaintext.
  const pick = (dbVal: string | null | undefined, envVal: string | undefined) => {
    const decrypted = decryptSecret(dbVal);
    return (decrypted && decrypted.trim()) || (envVal && envVal.trim()) || null;
  };

  const twilioSid = pick(s?.twilio_account_sid, process.env.TWILIO_ACCOUNT_SID);
  const twilioToken = pick(s?.twilio_auth_token, process.env.TWILIO_AUTH_TOKEN);
  const twilioPhone = pick(s?.twilio_phone_number, process.env.TWILIO_PHONE_NUMBER);
  const whatsapp = pick(s?.whatsapp_sender, process.env.TWILIO_WHATSAPP_NUMBER);
  const resendKey = pick(s?.resend_api_key, process.env.RESEND_API_KEY);
  const aiKey = pick(s?.openai_api_key, process.env.OPENAI_API_KEY);

  const forceDryRun = envBool(process.env.DRY_RUN, false) || (s?.dry_run ?? true);

  return {
    orgId,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    forceDryRun,
    twilio: {
      accountSid: twilioSid,
      authToken: twilioToken,
      phoneNumber: twilioPhone,
      whatsappNumber: whatsapp,
      enabled: !forceDryRun && !!(twilioSid && twilioToken && twilioPhone),
    },
    email: {
      resendApiKey: resendKey,
      // Falls back to the client's own brand so outgoing mail is never
      // attributed to the template's name.
      from: process.env.EMAIL_FROM || `${brand.name} <noreply@${emailDomain()}>`,
      enabled: !forceDryRun && !!resendKey,
    },
    ai: {
      apiKey: aiKey,
      baseUrl:
        pick(s?.openai_base_url, process.env.OPENAI_BASE_URL) ||
        "https://api.openai.com/v1",
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      // AI has no side effects; allow whenever a key exists.
      enabled: !!aiKey,
    },
    webhookSecret: pick(s?.lead_webhook_secret, process.env.LEAD_WEBHOOK_SECRET),
    socialWebhookUrl: pick(s?.social_webhook_url, process.env.SOCIAL_WEBHOOK_URL),
    assignmentMode: s?.default_assignment_mode ?? "round_robin",
    whatsappMode: s?.whatsapp_mode ?? "deep_link",
  };
}
