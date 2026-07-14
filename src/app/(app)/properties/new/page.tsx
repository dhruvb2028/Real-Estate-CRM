import type { Metadata } from "next";
import { requireProfile } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { PropertyForm } from "@/components/properties/property-form";

export const metadata: Metadata = { title: "Add property" };

export default async function NewPropertyPage() {
  const profile = await requireProfile();
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Add property" description="List a new property in your inventory" />
      <PropertyForm orgId={profile.organization_id!} />
    </div>
  );
}
