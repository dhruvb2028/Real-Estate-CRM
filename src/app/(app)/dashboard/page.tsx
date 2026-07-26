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
  BarChart3,
  ArrowUpRight,
} from "lucide-react";
import { requireProfile } from "@/lib/supabase/server";
import { getDashboardStats, getRecentActivity } from "@/server/queries/dashboard";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { AnimatedNumber, FadeIn, Stagger, StaggerItem } from "@/components/motion";
import { ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

function StatTile({
  label,
  value,
  suffix,
  href,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number;
  suffix?: string;
  href: string;
  icon: typeof Flame;
  tone?: "default" | "gold" | "hot" | "warn";
}) {
  return (
    <Link href={href} className="group block h-full">
      <div className="card-lift relative h-full overflow-hidden rounded-2xl border border-border bg-card p-4">
        <span
          className={cn(
            "absolute -right-5 -top-5 size-20 rounded-full opacity-[0.09] transition-transform duration-300 group-hover:scale-125",
            tone === "gold" && "bg-gold opacity-20",
            tone === "hot" && "bg-red-500 opacity-15",
            tone === "warn" && "bg-amber-500 opacity-15",
            tone === "default" && "bg-foreground"
          )}
          aria-hidden
        />
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "flex size-9 items-center justify-center rounded-xl",
              tone === "gold" && "bg-gold/15 text-gold",
              tone === "hot" && "bg-red-500/10 text-red-500",
              tone === "warn" && "bg-amber-500/12 text-amber-600 dark:text-amber-400",
              tone === "default" && "bg-secondary text-foreground/70"
            )}
          >
            <Icon className="size-4.5" aria-hidden />
          </span>
          <ArrowUpRight
            className="size-4 text-muted-foreground/0 transition-all duration-200 group-hover:text-muted-foreground/70"
            aria-hidden
          />
        </div>
        <p className="mt-3 text-[28px] font-bold leading-none tracking-tight">
          <AnimatedNumber value={value} />
          {suffix && (
            <span className="text-base font-semibold text-muted-foreground">{suffix}</span>
          )}
        </p>
        <p className="mt-1.5 text-[12.5px] font-medium text-muted-foreground">{label}</p>
      </div>
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

  const quickActions = [
    { href: "/leads/new", label: "Add lead", icon: UserPlus, primary: true },
    { href: "/properties/new", label: "Add property", icon: Plus },
    { href: "/followups", label: "Follow-ups", icon: CalendarClock },
    { href: "/attendance", label: "Check in", icon: MapPin },
  ];

  return (
    <div className="space-y-5">
      {/* Hero */}
      <FadeIn>
        <div className="bg-luxe relative overflow-hidden rounded-3xl p-6 md:p-8">
          <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-gold">
            {ROLE_LABELS[profile.role]}
          </p>
          <h1 className="font-display mt-1.5 text-3xl font-semibold text-white md:text-4xl">
            {greeting}, <span className="italic">{firstName}</span>
          </h1>
          <p className="mt-2 text-sm text-white/55">
            Here&apos;s your business at a glance today.
          </p>

          <div className="no-scrollbar -mx-1 mt-5 flex gap-2 overflow-x-auto px-1">
            {quickActions.map(({ href, label, icon: Icon, primary }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex h-11 shrink-0 items-center gap-2 rounded-full px-4.5 text-sm font-semibold transition-all duration-200 active:scale-95",
                  primary
                    ? "bg-gradient-to-b from-[oklch(0.78_0.13_90)] to-[oklch(0.64_0.14_82)] text-[oklch(0.2_0.03_70)] shadow-[0_6px_18px_-6px_oklch(0.686_0.135_85/60%)] hover:brightness-105"
                    : "border border-white/15 bg-white/6 text-white/85 backdrop-blur hover:bg-white/12"
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </FadeIn>

      {/* Stats */}
      <Stagger className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StaggerItem>
          <StatTile
            label="New leads today"
            value={stats.newLeadsToday}
            href="/leads?status=new"
            icon={UserPlus}
            tone="gold"
          />
        </StaggerItem>
        <StaggerItem>
          <StatTile
            label="Calls today"
            value={stats.callsToday}
            href="/leads"
            icon={PhoneCall}
          />
        </StaggerItem>
        <StaggerItem>
          <StatTile
            label="Follow-ups due"
            value={stats.followupsDueToday}
            href="/followups"
            icon={CalendarClock}
            tone={stats.followupsDueToday > 0 ? "warn" : "default"}
          />
        </StaggerItem>
        <StaggerItem>
          <StatTile
            label="Hot leads"
            value={stats.hotLeads}
            href="/leads?temperature=hot"
            icon={Flame}
            tone="hot"
          />
        </StaggerItem>
        <StaggerItem>
          <StatTile
            label="Site visits scheduled"
            value={stats.siteVisits}
            href="/leads?status=site_visit_scheduled"
            icon={MapPin}
          />
        </StaggerItem>
        <StaggerItem>
          <StatTile
            label="Available inventory"
            value={stats.availableInventory}
            href="/properties?availability=available"
            icon={Building2}
            tone="gold"
          />
        </StaggerItem>
        <StaggerItem>
          <StatTile
            label="Team checked in"
            value={stats.checkedInToday}
            suffix={`/${stats.teamSize}`}
            href="/attendance"
            icon={UsersRound}
          />
        </StaggerItem>
        <StaggerItem>
          <Link href="/reports" className="group block h-full">
            <div className="card-lift relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-transparent bg-gradient-to-br from-[oklch(0.28_0.01_56)] to-[oklch(0.2_0.008_56)] p-4">
              <span className="flex size-9 items-center justify-center rounded-xl bg-gold/20 text-gold">
                <BarChart3 className="size-4.5" aria-hidden />
              </span>
              <div>
                <p className="font-display text-lg font-semibold text-white">Reports</p>
                <p className="mt-0.5 flex items-center gap-1 text-[12.5px] font-medium text-white/50">
                  Business performance
                  <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
                </p>
              </div>
            </div>
          </Link>
        </StaggerItem>
      </Stagger>

      {/* Recent activity (live) */}
      <FadeIn delay={0.15}>
        <ActivityFeed initial={activity} />
      </FadeIn>
    </div>
  );
}
