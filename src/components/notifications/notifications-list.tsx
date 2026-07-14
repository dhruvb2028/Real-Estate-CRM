"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  CalendarClock,
  CheckCheck,
  Flame,
  MapPin,
  Megaphone,
  PhoneMissed,
  Share2,
  UserPlus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AppNotification, NotificationType } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<NotificationType, typeof Bell> = {
  new_lead_assigned: UserPlus,
  missed_lead_call: PhoneMissed,
  followup_due: CalendarClock,
  site_visit_scheduled: MapPin,
  property_shared: Share2,
  attendance_issue: Flame,
  social_post_due: Megaphone,
  general: Bell,
};

export function NotificationsList({
  initial,
  userId,
}: {
  initial: AppNotification[];
  userId: string;
}) {
  const [notifications, setNotifications] = useState(initial);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read_at).length,
    [notifications]
  );

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("notifications-page")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) =>
          setNotifications((prev) => [payload.new as AppNotification, ...prev])
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  async function markRead(id: string) {
    const now = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: n.read_at ?? now } : n))
    );
    const supabase = createClient();
    await supabase.from("notifications").update({ read_at: now }).eq("id", id).is("read_at", null);
  }

  async function markAllRead() {
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })));
    const supabase = createClient();
    await supabase.from("notifications").update({ read_at: now }).is("read_at", null);
  }

  const visible = tab === "unread" ? notifications.filter((n) => !n.read_at) : notifications;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "unread")}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">
              Unread{unreadCount ? ` (${unreadCount})` : ""}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" className="h-9 gap-1.5" onClick={markAllRead}>
            <CheckCheck className="size-4" aria-hidden /> Mark all read
          </Button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border py-16 text-center">
          <Bell className="mb-3 size-9 text-muted-foreground/50" aria-hidden />
          <p className="text-sm text-muted-foreground">
            {tab === "unread" ? "You're all caught up." : "No notifications yet."}
          </p>
        </div>
      ) : (
        <Card className="gap-0 p-0">
          <ul className="divide-y divide-border">
            {visible.map((n) => {
              const Icon = TYPE_ICONS[n.type] ?? Bell;
              return (
                <li key={n.id}>
                  <Link
                    href={n.link ?? "#"}
                    onClick={() => void markRead(n.id)}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-accent",
                      !n.read_at && "bg-primary/[0.04]"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
                        n.read_at
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary/10 text-primary"
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className={cn("truncate text-sm", !n.read_at && "font-semibold")}>
                          {n.title}
                        </span>
                        {!n.read_at && (
                          <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
                        )}
                      </span>
                      {n.body && (
                        <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                          {n.body}
                        </span>
                      )}
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
