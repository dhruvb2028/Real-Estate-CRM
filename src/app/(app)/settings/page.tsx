import type { Metadata } from "next";
import Link from "next/link";
import { Plug, ChevronRight } from "lucide-react";
import { createClient, requireProfile } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { ProfileForm, OrganizationForm } from "./settings-forms";
import { Card } from "@/components/ui/card";
import type { Organization } from "@/lib/types";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", profile.organization_id!)
    .single();

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PageHeader title="Settings" description="Your profile and workspace" />

      <ProfileForm profile={profile} />

      {profile.role === "admin" && org && (
        <>
          <OrganizationForm org={org as Organization} />
          <Link href="/settings/integrations" className="block">
            <Card className="flex flex-row items-center gap-4 px-4 py-3.5 transition-colors hover:bg-accent">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Plug className="size-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Integrations</p>
                <p className="truncate text-sm text-muted-foreground">
                  Twilio, WhatsApp, email, AI, lead webhook
                </p>
              </div>
              <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
            </Card>
          </Link>
        </>
      )}
    </div>
  );
}
