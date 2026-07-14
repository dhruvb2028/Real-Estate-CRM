"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Activity as ActivityIcon, Radio } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import type { Activity } from "@/lib/types";

/** Live activity feed — new events stream in via Supabase Realtime. */
export function ActivityFeed({ initial }: { initial: Activity[] }) {
  const [items, setItems] = useState(initial);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("dashboard-activities")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activities" },
        (payload) =>
          setItems((prev) => [payload.new as Activity, ...prev].slice(0, 15))
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Card className="gap-0 p-0">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="font-semibold">Recent activity</p>
        {live && (
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-primary">
            <Radio className="size-3.5 animate-pulse" aria-hidden />
            Live
          </span>
        )}
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          Activity from calls, messages and lead updates will appear here.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((a) => (
            <li key={a.id}>
              <Link
                href={a.lead_id ? `/leads/${a.lead_id}` : "#"}
                className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent"
              >
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <ActivityIcon className="size-3.5 text-primary" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{a.title}</span>
                  {a.description && (
                    <span className="line-clamp-1 block text-xs text-muted-foreground">
                      {a.description}
                    </span>
                  )}
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
