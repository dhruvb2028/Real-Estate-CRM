"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarClock,
  ClipboardList,
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
  { href: "/tasks", label: "Tasks & Visits", icon: ClipboardList },
  { href: "/attendance", label: "Attendance", icon: MapPin },
  { href: "/social", label: "Social Media", icon: Megaphone },
  { href: "/team", label: "Team", icon: UsersRound },
  { href: "/reports", label: "Reports", icon: BarChart3, managersOnly: true },
  { href: "/settings/integrations", label: "Integrations", icon: Plug, adminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings, exact: true },
];

/** Dark luxe sidebar — desktop only. */
export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();

  return (
    <aside className="bg-luxe fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-white/8 md:flex">
      <div className="flex h-16 items-center px-5">
        <Link href="/dashboard" aria-label="EstateFlow home">
          <Logo onDark />
        </Link>
      </div>

      <nav aria-label="Primary" className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
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
                  "relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-medium transition-colors duration-200",
                  active
                    ? "text-[oklch(0.9_0.09_90)]"
                    : "text-white/55 hover:bg-white/6 hover:text-white/90"
                )}
              >
                {active && (
                  <span
                    aria-hidden
                    className="gold-ring absolute inset-0 rounded-xl bg-white/8"
                  />
                )}
                <Icon
                  className={cn("relative z-10 size-4.5", active && "text-gold")}
                  aria-hidden
                  strokeWidth={active ? 2.3 : 2}
                />
                <span className="relative z-10">{label}</span>
              </Link>
            );
          })}
      </nav>

      <div className="border-t border-white/8 px-5 py-4">
        <p className="font-display text-[13px] italic text-white/40">
          Close more deals, faster.
        </p>
      </div>
    </aside>
  );
}
