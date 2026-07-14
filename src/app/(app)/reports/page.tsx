import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarCheck2, Share2, Trophy } from "lucide-react";
import { requireProfile } from "@/lib/supabase/server";
import { getReportsData } from "@/server/queries/reports";
import { PageHeader } from "@/components/layout/page-header";
import { CategoryBars, Donut } from "@/components/reports/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const profile = await requireProfile();
  if (!["admin", "sales_manager"].includes(profile.role)) redirect("/dashboard");

  const data = await getReportsData();

  return (
    <>
      <PageHeader title="Reports" description="Last 30 days of business performance" />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="gap-1 p-4">
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
            <Trophy className="size-4 text-primary" aria-hidden /> Leads won
          </p>
          <p className="text-2xl font-bold">{data.wonLost.won}</p>
          <p className="text-xs text-muted-foreground">{data.wonLost.lost} lost</p>
        </Card>
        <Card className="gap-1 p-4">
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
            <CalendarCheck2 className="size-4 text-primary" aria-hidden /> Follow-ups done
          </p>
          <p className="text-2xl font-bold">{data.followupsCompleted30d}</p>
          <p className="text-xs text-muted-foreground">in last 30 days</p>
        </Card>
        <Card className="gap-1 p-4">
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
            <Share2 className="size-4 text-primary" aria-hidden /> Properties shared
          </p>
          <p className="text-2xl font-bold">{data.propertiesShared30d}</p>
          <p className="text-xs text-muted-foreground">in last 30 days</p>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-base">Leads by source</CardTitle>
          </CardHeader>
          <CardContent>
            {data.leadsBySource.length ? (
              <CategoryBars data={data.leadsBySource} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No leads yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-base">Leads by status</CardTitle>
          </CardHeader>
          <CardContent>
            {data.leadsByStatus.length ? (
              <CategoryBars data={data.leadsByStatus} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No leads yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-base">Pipeline outcome</CardTitle>
          </CardHeader>
          <CardContent>
            <Donut
              data={[
                { name: "Open", value: data.wonLost.open },
                { name: "Won", value: data.wonLost.won },
                { name: "Lost", value: data.wonLost.lost },
              ].filter((d) => d.value > 0)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-base">Attendance (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.attendanceSummary30d.length ? (
              <Donut data={data.attendanceSummary30d} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No attendance records yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="pb-1">
          <CardTitle className="text-base">Agent call performance (30 days)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {data.agentPerformance.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No agents yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">Connected</TableHead>
                  <TableHead className="text-right">Avg duration</TableHead>
                  <TableHead className="text-right">Follow-ups done</TableHead>
                  <TableHead className="text-right">Won</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.agentPerformance.map((a) => (
                  <TableRow key={a.agent}>
                    <TableCell className="font-medium">{a.agent}</TableCell>
                    <TableCell className="text-right">{a.calls}</TableCell>
                    <TableCell className="text-right">{a.connected}</TableCell>
                    <TableCell className="text-right">
                      {a.avgDurationSec
                        ? `${Math.floor(a.avgDurationSec / 60)}m ${a.avgDurationSec % 60}s`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">{a.followupsCompleted}</TableCell>
                    <TableCell className="text-right">{a.leadsWon}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
