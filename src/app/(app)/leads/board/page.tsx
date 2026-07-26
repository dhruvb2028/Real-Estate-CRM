import type { Metadata } from "next";
import Link from "next/link";
import { List, Plus } from "lucide-react";
import { getLeads } from "@/server/queries/leads";
import { PageHeader } from "@/components/layout/page-header";
import { LeadBoard } from "@/components/leads/board";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Lead pipeline" };
export const dynamic = "force-dynamic";

export default async function LeadBoardPage() {
  const leads = await getLeads({});

  return (
    <>
      <PageHeader
        title="Pipeline"
        description="Move leads through your sales stages"
        action={
          <div className="flex gap-2">
            <Button variant="outline" render={<Link href="/leads" />} className="h-11 md:h-10">
              <List className="size-4" aria-hidden /> List
            </Button>
            <Button render={<Link href="/leads/new" />} className="h-11 md:h-10">
              <Plus className="size-4" aria-hidden /> Add
            </Button>
          </div>
        }
      />
      <LeadBoard leads={leads} />
    </>
  );
}
