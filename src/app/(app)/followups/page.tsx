import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";
import { requireProfile } from "@/lib/supabase/server";
import { getFollowups } from "@/server/queries/followups";
import { PageHeader } from "@/components/layout/page-header";
import { FollowupCard } from "@/components/followups/followup-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Followup } from "@/lib/types";

export const metadata: Metadata = { title: "Follow-ups" };
export const dynamic = "force-dynamic";

function Empty({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border py-14 text-center">
      <CalendarClock className="mb-3 size-9 text-muted-foreground/50" aria-hidden />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function List({
  items,
  variant,
  emptyLabel,
}: {
  items: Followup[];
  variant: "overdue" | "today" | "upcoming" | "completed";
  emptyLabel: string;
}) {
  if (items.length === 0) return <Empty label={emptyLabel} />;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((f) => (
        <FollowupCard key={f.id} followup={f} variant={variant} />
      ))}
    </div>
  );
}

export default async function FollowupsPage() {
  const profile = await requireProfile();
  // Agents see their own follow-ups; managers see everyone's.
  const scoped = !["admin", "sales_manager"].includes(profile.role);
  const groups = await getFollowups(scoped ? profile.id : undefined);

  return (
    <>
      <PageHeader
        title="Follow-ups"
        description={
          groups.overdue.length
            ? `${groups.overdue.length} overdue — clear them first`
            : "You're on top of your pipeline"
        }
      />

      <Tabs defaultValue={groups.overdue.length ? "overdue" : "today"}>
        <TabsList className="mb-3 w-full justify-start overflow-x-auto">
          <TabsTrigger value="overdue">
            Overdue{groups.overdue.length ? ` (${groups.overdue.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="today">
            Today{groups.today.length ? ` (${groups.today.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            Upcoming{groups.upcoming.length ? ` (${groups.upcoming.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="completed">Done</TabsTrigger>
        </TabsList>

        <TabsContent value="overdue">
          <List items={groups.overdue} variant="overdue" emptyLabel="Nothing overdue. Great job!" />
        </TabsContent>
        <TabsContent value="today">
          <List items={groups.today} variant="today" emptyLabel="No follow-ups due today." />
        </TabsContent>
        <TabsContent value="upcoming">
          <List
            items={groups.upcoming}
            variant="upcoming"
            emptyLabel="No upcoming follow-ups scheduled."
          />
        </TabsContent>
        <TabsContent value="completed">
          <List items={groups.completed} variant="completed" emptyLabel="No completed follow-ups yet." />
        </TabsContent>
      </Tabs>
    </>
  );
}
