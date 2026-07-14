import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  ClipboardList,
  MapPin,
  Megaphone,
  UsersRound,
  Settings,
  Plug,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import { requireProfile } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { ROLE_LABELS } from "@/lib/constants";

export const metadata: Metadata = { title: "More" };

const sections = [
  {
    href: "/tasks",
    label: "Tasks & Site Visits",
    description: "Assigned work and visit schedules",
    icon: ClipboardList,
  },
  {
    href: "/attendance",
    label: "Attendance",
    description: "Check in/out and view history",
    icon: MapPin,
  },
  {
    href: "/notifications",
    label: "Notifications",
    description: "Everything that needs your attention",
    icon: Bell,
  },
  {
    href: "/social",
    label: "Social Media",
    description: "Content calendar and post planning",
    icon: Megaphone,
  },
  {
    href: "/team",
    label: "Team",
    description: "Members, roles and invites",
    icon: UsersRound,
  },
  {
    href: "/reports",
    label: "Reports",
    description: "Leads, calls and performance",
    icon: BarChart3,
    managersOnly: true,
  },
  {
    href: "/settings/integrations",
    label: "Integrations",
    description: "Twilio, WhatsApp, email, webhooks, AI",
    icon: Plug,
    adminOnly: true,
  },
  {
    href: "/settings",
    label: "Settings",
    description: "Profile and workspace preferences",
    icon: Settings,
  },
];

export default async function MorePage() {
  const profile = await requireProfile();

  return (
    <>
      <PageHeader
        title="More"
        description={`Signed in as ${profile.full_name} · ${ROLE_LABELS[profile.role]}`}
      />
      <div className="space-y-2.5">
        {sections
          .filter((s) => {
            if (s.adminOnly && profile.role !== "admin") return false;
            if (s.managersOnly && !["admin", "sales_manager"].includes(profile.role))
              return false;
            return true;
          })
          .map(({ href, label, description, icon: Icon }) => (
            <Link key={href} href={href} className="block">
              <Card className="flex flex-row items-center gap-4 px-4 py-3.5 transition-colors hover:bg-accent">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{label}</p>
                  <p className="truncate text-sm text-muted-foreground">{description}</p>
                </div>
                <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
              </Card>
            </Link>
          ))}
      </div>
    </>
  );
}
