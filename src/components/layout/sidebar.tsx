"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarClock,
  MapPin,
  Megaphone,
  UsersRound,
  BarChart3,
  Plug,
  Settings,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/followups", label: "Follow-ups", icon: CalendarClock },
  { href: "/attendance", label: "Attendance", icon: MapPin },
  { href: "/social", label: "Social Media", icon: Megaphone },
  { href: "/team", label: "Team", icon: UsersRound },
  { href: "/reports", label: "Reports", icon: BarChart3, managersOnly: true },
  { href: "/settings/integrations", label: "Integrations", icon: Plug, adminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings, exact: true },
];

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-sidebar md:flex">
      <div className="flex h-16 items-center px-5">
        <Link href="/dashboard" aria-label="EstateFlow home">
          <Logo />
        </Link>
      </div>
      <nav aria-label="Primary" className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {nav
          .filter((item) => {
            if (item.adminOnly && role !== "admin") return false;
            if (item.managersOnly && !["admin", "sales_manager"].includes(role)) return false;
            return true;
          })
          .map(({ href, label, icon: Icon, exact }) => {
            const active = exact
              ? pathname === href
              : pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="size-4.5" aria-hidden />
                {label}
              </Link>
            );
          })}
      </nav>
      <p className="px-5 pb-4 text-[11px] text-muted-foreground">EstateFlow CRM v1.0</p>
    </aside>
  );
}
