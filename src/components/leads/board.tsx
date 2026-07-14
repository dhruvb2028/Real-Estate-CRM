"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { motion } from "framer-motion";
import { Flame, MoveRight } from "lucide-react";
import { toast } from "sonner";
import { updateLeadStatus } from "@/server/actions/leads";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LEAD_STATUS_COLORS,
  LEAD_STATUS_LABELS,
  formatBudget,
} from "@/lib/constants";
import type { LeadStatus, LeadWithAgent } from "@/lib/types";
import { cn } from "@/lib/utils";

const BOARD_COLUMNS: LeadStatus[] = [
  "new",
  "call_pending",
  "contacted",
  "interested",
  "site_visit_scheduled",
  "negotiation",
  "won",
  "lost",
];

export function LeadBoard({ leads }: { leads: LeadWithAgent[] }) {
  const [, startTransition] = useTransition();
  const [optimisticLeads, moveLead] = useOptimistic(
    leads,
    (state, { id, status }: { id: string; status: LeadStatus }) =>
      state.map((l) => (l.id === id ? { ...l, status } : l))
  );

  function onMove(lead: LeadWithAgent, status: LeadStatus) {
    startTransition(async () => {
      moveLead({ id: lead.id, status });
      const r = await updateLeadStatus(lead.id, status);
      if (!r.ok) toast.error(r.error);
    });
  }

  return (
    <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4">
      {BOARD_COLUMNS.map((status) => {
        const column = optimisticLeads.filter((l) => l.status === status);
        return (
          <section
            key={status}
            aria-label={LEAD_STATUS_LABELS[status]}
            className="w-72 shrink-0 snap-start rounded-xl bg-muted/60 p-2"
          >
            <header className="flex items-center justify-between px-2 py-1.5">
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  LEAD_STATUS_COLORS[status]
                )}
              >
                {LEAD_STATUS_LABELS[status]}
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                {column.length}
              </span>
            </header>

            <div className="mt-1 space-y-2">
              {column.length === 0 && (
                <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                  No leads
                </p>
              )}
              {column.map((lead) => (
                <motion.article
                  key={lead.id}
                  layout
                  layoutId={lead.id}
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  className="rounded-lg border border-border bg-card p-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="min-w-0 font-semibold hover:text-primary"
                    >
                      <span className="flex items-center gap-1 text-sm">
                        <span className="truncate">{lead.full_name}</span>
                        {lead.temperature === "hot" && (
                          <Flame className="size-3.5 shrink-0 text-red-500" aria-label="Hot" />
                        )}
                      </span>
                    </Link>

                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        aria-label={`Move ${lead.full_name}`}
                      >
                        <MoveRight className="size-4" aria-hidden />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel className="text-xs">Move to</DropdownMenuLabel>
                        {BOARD_COLUMNS.filter((s) => s !== status).map((s) => (
                          <DropdownMenuItem key={s} onClick={() => onMove(lead, s)}>
                            {LEAD_STATUS_LABELS[s]}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {lead.preferred_location ?? "—"} ·{" "}
                    {formatBudget(lead.budget_min, lead.budget_max)}
                  </p>
                  {lead.assigned_agent && (
                    <Badge variant="outline" className="mt-2 max-w-full text-[10px]">
                      <span className="truncate">{lead.assigned_agent.full_name}</span>
                    </Badge>
                  )}
                </motion.article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
