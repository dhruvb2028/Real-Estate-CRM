"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Flame, MapPin, MessageCircle, Phone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_COLORS,
  LEAD_STATUS_LABELS,
  TEMPERATURE_COLORS,
  formatBudget,
  initials,
  waPhone,
} from "@/lib/constants";
import type { LeadWithAgent } from "@/lib/types";
import { cn } from "@/lib/utils";

export function LeadCard({ lead }: { lead: LeadWithAgent }) {
  const router = useRouter();

  return (
    <Card
      role="link"
      tabIndex={0}
      aria-label={`Open lead ${lead.full_name}`}
      onClick={() => router.push(`/leads/${lead.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(`/leads/${lead.id}`);
      }}
      className="cursor-pointer gap-0 p-4 transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-10 shrink-0">
            <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
              {initials(lead.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-semibold">
              <span className="truncate">{lead.full_name}</span>
              {lead.temperature === "hot" && (
                <Flame className="size-4 shrink-0 text-red-500" aria-label="Hot lead" />
              )}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {LEAD_SOURCE_LABELS[lead.source]} ·{" "}
              {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
        <Badge className={cn("shrink-0 border-0", LEAD_STATUS_COLORS[lead.status])}>
          {LEAD_STATUS_LABELS[lead.status]}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {lead.preferred_location && (
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden />
            {lead.preferred_location}
          </span>
        )}
        <span>{formatBudget(lead.budget_min, lead.budget_max)}</span>
        {lead.assigned_agent && (
          <span className="truncate">→ {lead.assigned_agent.full_name}</span>
        )}
      </div>

      {/* WhatsApp-style quick actions */}
      <div
        className="mt-3 grid grid-cols-3 gap-2"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <a
          href={`tel:${lead.phone}`}
          className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary/10 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
          aria-label={`Call ${lead.full_name}`}
        >
          <Phone className="size-4" aria-hidden /> Call
        </a>
        <a
          href={`https://wa.me/${waPhone(lead.phone)}?text=${encodeURIComponent(
            `Hi ${lead.full_name.split(" ")[0]}, `
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400"
          aria-label={`WhatsApp ${lead.full_name}`}
        >
          <MessageCircle className="size-4" aria-hidden /> WhatsApp
        </a>
        <Link
          href={`/leads/${lead.id}`}
          className={cn(
            "flex h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors",
            TEMPERATURE_COLORS[lead.temperature],
            "hover:opacity-85"
          )}
          aria-label={`Open ${lead.full_name}`}
        >
          Details
        </Link>
      </div>
    </Card>
  );
}
