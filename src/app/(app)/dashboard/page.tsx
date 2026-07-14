import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  CalendarClock,
  Flame,
  MapPin,
  PhoneCall,
  Plus,
  UserPlus,
  UsersRound,
  Activity as ActivityIcon,
} from "lucide-react";
import { requireProfile } from "@/lib/supabase/server";
import { getDashboardStats, getRecentActivity } from "@/server/queries/dashboard";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { Card } from "@/components/ui/card";
import { ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  href,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  href: string;
  icon: typeof Flame;
  accent?: string;
}) {
  return (
    <Link href={href} className="block">
      <Card className="gap-1 p-4 transition-shadow hover:shadow-md">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-lg",
              accent ?? "bg-primary/10 text-primary"
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
        </div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
      </Card>
    </Link>
  );
}

export default async function DashboardPage() {
  const profile = await requireProfile();
  const [stats, activity] = await Promise.all([
    getDashboardStats(),
    getRecentActivity(),
  ]);

  const firstName = profile.full_name.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">
          {greeting}, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground">
          {ROLE_LABELS[profile.role]} · Here&apos;s your day at a glance
        </p>
      </div>

      {/* Quick actions */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {[
          { href: "/leads/new", label: "Add lead", icon: UserPlus },
          { href: "/properties/new", label: "Add property", icon: Plus },
          { href: "/followups", label: "Follow-ups", icon: CalendarClock },
          { href: "/attendance", label: "Check in", icon: MapPin },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="New leads today"
          value={stats.newLeadsToday}
          href="/leads?status=new"
          icon={UserPlus}
        />
        <StatCard
          label="Calls today"
          value={stats.callsToday}
          href="/leads"
          icon={PhoneCall}
        />
        <StatCard
          label="Follow-ups due"
          value={stats.followupsDueToday}
          href="/followups"
          icon={CalendarClock}
          accent={
            stats.followupsDueToday > 0
              ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
              : undefined
          }
        />
        <StatCard
          label="Hot leads"
          value={stats.hotLeads}
          href="/leads?temperature=hot"
          icon={Flame}
          accent="bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
        />
        <StatCard
          label="Site visits scheduled"
          value={stats.siteVisits}
          href="/leads?status=site_visit_scheduled"
          icon={MapPin}
        />
        <StatCard
          label="Available inventory"
          value={stats.availableInventory}
          href="/properties?availability=available"
          icon={Building2}
        />
        <StatCard
          label="Team checked in"
          value={`${stats.checkedInToday}/${stats.teamSize}`}
          href="/attendance"
          icon={UsersRound}
        />
        <StatCard
          label="Reports"
          value="→"
          href="/reports"
          icon={ActivityIcon}
        />
      </div>

      {/* Recent activity (live) */}
      <ActivityFeed initial={activity} />
    </div>
  );
}
