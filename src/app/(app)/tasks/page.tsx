import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { requireProfile } from "@/lib/supabase/server";
import { getAssignableMembers, getTasks } from "@/server/queries/tasks";
import { getLeadsForShare } from "@/server/queries/properties";
import { PageHeader } from "@/components/layout/page-header";
import { TaskCard } from "@/components/tasks/task-card";
import { TaskFormDrawer } from "@/components/tasks/task-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TaskWithRelations } from "@/server/queries/tasks";

export const metadata: Metadata = { title: "Tasks & Site Visits" };
export const dynamic = "force-dynamic";

function List({ items, empty }: { items: TaskWithRelations[]; empty: string }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed border-border py-14 text-center">
        <ClipboardList className="mb-3 size-9 text-muted-foreground/50" aria-hidden />
        <p className="text-sm text-muted-foreground">{empty}</p>
      </div>
    );
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((t) => (
        <TaskCard key={t.id} task={t} />
      ))}
    </div>
  );
}

export default async function TasksPage() {
  const profile = await requireProfile();
  const isManager = ["admin", "sales_manager"].includes(profile.role);

  const [tasks, members, leads] = await Promise.all([
    getTasks(isManager ? undefined : profile.id),
    getAssignableMembers(),
    getLeadsForShare(),
  ]);

  const open = tasks.filter((t) => t.status === "pending" || t.status === "in_progress");
  const siteVisits = open.filter((t) => t.task_type === "site_visit");
  const done = tasks.filter((t) => t.status === "completed");

  return (
    <>
      <PageHeader
        title="Tasks & Site Visits"
        description={isManager ? "Everything assigned across the team" : "Your assigned work"}
        action={<TaskFormDrawer members={members} leads={leads} />}
      />

      <Tabs defaultValue="open">
        <TabsList className="mb-3">
          <TabsTrigger value="open">Open ({open.length})</TabsTrigger>
          <TabsTrigger value="visits">Site visits ({siteVisits.length})</TabsTrigger>
          <TabsTrigger value="done">Done</TabsTrigger>
        </TabsList>
        <TabsContent value="open">
          <List items={open} empty="No open tasks. Create one to get started." />
        </TabsContent>
        <TabsContent value="visits">
          <List items={siteVisits} empty="No site visits scheduled." />
        </TabsContent>
        <TabsContent value="done">
          <List items={done} empty="Nothing completed yet." />
        </TabsContent>
      </Tabs>
    </>
  );
}
