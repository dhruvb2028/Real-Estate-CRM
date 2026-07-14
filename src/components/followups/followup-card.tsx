"use client";

import Link from "next/link";
import { useTransition } from "react";
import { format, formatDistanceToNow, isToday, isTomorrow } from "date-fns";
import {
  AlarmClock,
  Check,
  ChevronRight,
  Flame,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { completeFollowup, snoozeFollowup } from "@/server/actions/followups";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FOLLOWUP_TYPE_LABELS } from "@/lib/constants";
import type { Followup } from "@/lib/types";
import { cn } from "@/lib/utils";

function dueLabel(dueAt: string): string {
  const d = new Date(dueAt);
  if (isToday(d)) return `Today, ${format(d, "h:mm a")}`;
  if (isTomorrow(d)) return `Tomorrow, ${format(d, "h:mm a")}`;
  return format(d, "d MMM, h:mm a");
}

export function FollowupCard({
  followup,
  variant,
}: {
  followup: Followup;
  variant: "overdue" | "today" | "upcoming" | "completed";
}) {
  const [pending, startTransition] = useTransition();
  const lead = followup.lead;

  return (
    <Card className={cn("gap-0 p-4", variant === "overdue" && "border-destructive/40")}>
      <div className="flex items-start justify-between gap-2">
        <Link
          href={lead ? `/leads/${lead.id}` : "#"}
          className="group min-w-0 flex-1"
          aria-label={lead ? `Open lead ${lead.full_name}` : undefined}
        >
          <p className="flex items-center gap-1.5 font-semibold group-hover:text-primary">
            <span className="truncate">{lead?.full_name ?? "Unknown lead"}</span>
            {lead?.temperature === "hot" && (
              <Flame className="size-4 shrink-0 text-red-500" aria-label="Hot lead" />
            )}
            <ChevronRight
              className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {FOLLOWUP_TYPE_LABELS[followup.type]}
            {followup.notes ? ` · ${followup.notes}` : ""}
          </p>
        </Link>
        <Badge
          variant={variant === "overdue" ? "destructive" : "secondary"}
          className="shrink-0"
        >
          {variant === "overdue"
            ? `Overdue ${formatDistanceToNow(new Date(followup.due_at))}`
            : variant === "completed" && followup.completed_at
              ? `Done ${format(new Date(followup.completed_at), "d MMM")}`
              : dueLabel(followup.due_at)}
        </Badge>
      </div>

      {variant !== "completed" && (
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            disabled={pending}
            className="h-9 flex-1"
            onClick={() =>
              startTransition(async () => {
                const r = await completeFollowup(followup.id);
                if (r.ok) toast.success(r.message);
                else toast.error(r.error);
              })
            }
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Check className="size-4" aria-hidden />
            )}
            Done
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm" disabled={pending} className="h-9 flex-1" />
              }
            >
              <AlarmClock className="size-4" aria-hidden /> Snooze
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {[
                { label: "1 hour", hours: 1 },
                { label: "3 hours", hours: 3 },
                { label: "Tomorrow", hours: 24 },
                { label: "3 days", hours: 72 },
              ].map((o) => (
                <DropdownMenuItem
                  key={o.hours}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await snoozeFollowup(followup.id, o.hours);
                      if (r.ok) toast.success(r.message);
                      else toast.error(r.error);
                    })
                  }
                >
                  {o.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </Card>
  );
}
