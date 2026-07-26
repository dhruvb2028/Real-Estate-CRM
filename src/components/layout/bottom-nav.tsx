"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

/**
 * Floating glass pill navigation (mobile only). The active indicator slides
 * via a CSS transform rather than a layout-animation library, keeping the
 * shell bundle small on phones.
 */
export function BottomNav() {
  const pathname = usePathname();
  const activeIndex = items.findIndex(
    (i) => pathname === i.href || pathname.startsWith(i.href + "/")
  );

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-3 bottom-3 z-50 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="relative rounded-2xl border border-white/10 bg-[oklch(0.216_0.006_56/0.92)] p-1.5 shadow-[0_12px_40px_-8px_oklch(0.1_0.01_60/55%)] backdrop-blur-xl">
        {/* Sliding active pill */}
        {activeIndex >= 0 && (
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-1.5 top-1.5 left-1.5 rounded-xl bg-gradient-to-b from-[oklch(0.78_0.13_90)] to-[oklch(0.64_0.14_82)] shadow-[0_4px_14px_-4px_oklch(0.686_0.135_85/60%)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            style={{
              width: "calc((100% - 0.75rem) / 5)",
              transform: `translateX(calc(${activeIndex} * 100%))`,
            }}
          />
        )}

        <ul className="relative grid grid-cols-5 items-center">
          {items.map(({ href, label, icon: Icon }, i) => {
            const active = i === activeIndex;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-13 flex-col items-center justify-center gap-0.5 rounded-xl text-[10.5px] font-semibold transition-colors duration-200",
                    active
                      ? "text-[oklch(0.2_0.03_70)]"
                      : "text-white/55 active:text-white/85"
                  )}
                >
                  <Icon className="size-5" aria-hidden strokeWidth={active ? 2.4 : 2} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
