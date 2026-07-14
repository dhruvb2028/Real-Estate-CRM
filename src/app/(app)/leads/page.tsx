import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  Download,
  FileSpreadsheet,
  Kanban,
  Plus,
  Upload,
  UsersRound,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/layout/page-header";
import { LeadCard } from "@/components/leads/lead-card";
import { LeadFilters } from "@/components/leads/lead-filters";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getAgents, getLeads, type LeadFilters as Filters } from "@/server/queries/leads";

export const metadata: Metadata = { title: "Leads" };
export const dynamic = "force-dynamic";

async function LeadList({ filters }: { filters: Filters }) {
  const leads = await getLeads(filters);

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
        <UsersRound className="mb-3 size-10 text-muted-foreground/50" aria-hidden />
        <p className="font-semibold">No leads found</p>
        <p className="mb-4 mt-1 max-w-xs text-sm text-muted-foreground">
          Adjust your filters, add a lead manually, or point your lead sources at the intake
          webhook.
        </p>
        <Button render={<Link href="/leads/new" />}>
          <Plus className="size-4" aria-hidden /> Add lead
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {leads.map((lead) => (
        <LeadCard key={lead.id} lead={lead} />
      ))}
    </div>
  );
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const filters: Filters = {
    q: params.q,
    status: params.status,
    source: params.source,
    temperature: params.temperature,
    agent: params.agent,
  };
  const agents = await getAgents();

  return (
    <>
      <PageHeader
        title="Leads"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="icon" render={<Link href="/leads/board" aria-label="Pipeline board view" />} className="size-10">
              <Kanban className="size-4" aria-hidden />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="icon" className="size-10" aria-label="Import or export leads" />
                }
              >
                <FileSpreadsheet className="size-4" aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem render={<Link href="/leads/import" />}>
                  <Upload className="size-4" aria-hidden /> Import CSV
                </DropdownMenuItem>
                <DropdownMenuItem render={<a href="/api/leads/export" download />}>
                  <Download className="size-4" aria-hidden /> Export CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button render={<Link href="/leads/new" />} className="h-10">
              <Plus className="size-4" aria-hidden /> Add lead
            </Button>
          </div>
        }
      />
      <div className="space-y-4">
        <Suspense>
          <LeadFilters agents={agents} />
        </Suspense>
        <Suspense
          key={JSON.stringify(filters)}
          fallback={
            <div className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-xl" />
              ))}
            </div>
          }
        >
          <LeadList filters={filters} />
        </Suspense>
      </div>
    </>
  );
}
