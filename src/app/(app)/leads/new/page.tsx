import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { getAgents } from "@/server/queries/leads";
import { LeadForm } from "./lead-form";

export const metadata: Metadata = { title: "Add lead" };

export default async function NewLeadPage() {
  const agents = await getAgents();
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Add lead" description="Capture a new enquiry manually" />
      <LeadForm agents={agents.filter((a) => a.role === "sales_agent")} />
    </div>
  );
}
