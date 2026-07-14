import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, requireProfile } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { IntegrationsForm } from "./integrations-form";
import type { IntegrationSettings } from "@/lib/types";

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

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Integrations"
        description="Connect Twilio, WhatsApp, email, AI and lead sources"
      />
      <IntegrationsForm
        settings={(data as IntegrationSettings | null) ?? null}
        webhookEndpoint={`${appUrl}/api/webhooks/leads`}
        orgId={profile.organization_id!}
      />
    </div>
  );
}
