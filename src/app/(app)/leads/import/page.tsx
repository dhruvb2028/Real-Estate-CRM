import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { ImportWizard } from "./import-wizard";

export const metadata: Metadata = { title: "Import leads" };

export default async function ImportLeadsPage() {
  const profile = await requireProfile();
  if (!["admin", "sales_manager"].includes(profile.role)) redirect("/leads");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Import leads"
        description="Upload a CSV — columns are matched automatically"
      />
      <ImportWizard />
    </div>
  );
}
