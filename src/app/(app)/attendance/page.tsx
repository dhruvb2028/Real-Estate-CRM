import type { Metadata } from "next";
import { format } from "date-fns";
import { UsersRound } from "lucide-react";
import { requireProfile } from "@/lib/supabase/server";
import {
  getMyAttendance,
  getTeamAttendanceToday,
} from "@/server/queries/attendance";
import { PageHeader } from "@/components/layout/page-header";
import { CheckInCard } from "@/components/attendance/check-in-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ATTENDANCE_STATUS_LABELS, ROLE_LABELS, initials } from "@/lib/constants";

export const metadata: Metadata = { title: "Attendance" };
export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  const profile = await requireProfile();
  const isManager = ["admin", "sales_manager"].includes(profile.role);

  const [{ today, history }, team] = await Promise.all([
    getMyAttendance(profile.id),
    isManager ? getTeamAttendanceToday() : Promise.resolve(null),
  ]);

  const currentlyIn = team?.records.filter((r) => r.check_in_time && !r.check_out_time) ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Attendance" description="GPS check-in and daily history" />

      <CheckInCard today={today} orgId={profile.organization_id!} userId={profile.id} />

      {/* Admin: team today */}
      {isManager && team && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <UsersRound className="size-4 text-primary" aria-hidden />
                Team today
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                {currentlyIn.length} checked in · {team.teamSize} total
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {team.records.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No one has checked in yet today.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {team.records.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-2.5">
                    <Avatar className="size-9">
                      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                        {initials(r.user?.full_name ?? "?")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{r.user?.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.user ? ROLE_LABELS[r.user.role] : ""} ·{" "}
                        {r.check_in_time ? format(new Date(r.check_in_time), "h:mm a") : "—"}
                        {r.check_out_time
                          ? ` → ${format(new Date(r.check_out_time), "h:mm a")}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {r.check_in_time && !r.check_out_time && (
                        <span
                          className="size-2 rounded-full bg-emerald-500"
                          aria-label="Currently checked in"
                        />
                      )}
                      <Badge
                        variant={r.status === "late" ? "destructive" : "secondary"}
                        className="text-[11px]"
                      >
                        {ATTENDANCE_STATUS_LABELS[r.status]}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* My history */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">My history</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No attendance records yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {history.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium">
                      {format(new Date(r.work_date + "T00:00:00"), "EEE, d MMM")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.check_in_time ? format(new Date(r.check_in_time), "h:mm a") : "—"}
                      {r.check_out_time
                        ? ` → ${format(new Date(r.check_out_time), "h:mm a")}`
                        : " (no check-out)"}
                      {r.notes ? ` · ${r.notes}` : ""}
                    </p>
                  </div>
                  <Badge
                    variant={r.status === "late" ? "destructive" : "secondary"}
                    className="text-[11px]"
                  >
                    {ATTENDANCE_STATUS_LABELS[r.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
