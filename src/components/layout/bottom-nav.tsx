"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarClock,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/properties", label: "Estates", icon: Building2 },
  { href: "/followups", label: "Follow-ups", icon: CalendarClock },
  { href: "/more", label: "More", icon: Menu },
];

/** Floating glass pill navigation — mobile only. */
export function BottomNav() {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-3 bottom-3 z-50 md:hidden pb-safe"
    >
      <ul className="grid grid-cols-5 items-center rounded-2xl border border-white/10 bg-[oklch(0.216_0.006_56/0.92)] px-1.5 py-1.5 shadow-[0_12px_40px_-8px_oklch(0.1_0.01_60/55%)] backdrop-blur-xl">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href} className="relative">
              {active && (
                <motion.span
                  layoutId="bottom-nav-pill"
                  className="absolute inset-0 rounded-xl bg-gradient-to-b from-[oklch(0.78_0.13_90)] to-[oklch(0.64_0.14_82)] shadow-[0_4px_14px_-4px_oklch(0.686_0.135_85/60%)]"
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 420, damping: 34 }
                  }
                />
              )}
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative z-10 flex min-h-13 flex-col items-center justify-center gap-0.5 rounded-xl text-[10.5px] font-semibold transition-colors duration-200",
                  active
                    ? "text-[oklch(0.2_0.03_70)]"
                    : "text-white/55 hover:text-white/85"
                )}
              >
                <Icon className="size-5" aria-hidden strokeWidth={active ? 2.4 : 2} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
