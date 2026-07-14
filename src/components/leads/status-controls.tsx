"use client";

import { useTransition } from "react";
import { Flame } from "lucide-react";
import { toast } from "sonner";
import {
  assignLeadAgent,
  updateLeadStatus,
  updateLeadTemperature,
} from "@/server/actions/leads";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LEAD_STATUS_LABELS, TEMPERATURE_LABELS } from "@/lib/constants";
import type { Lead, LeadStatus, LeadTemperature } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusControls({
  lead,
  agents,
  canAssign,
}: {
  lead: Lead;
  agents: { id: string; full_name: string }[];
  canAssign: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={lead.status}
        disabled={pending}
        onValueChange={(v) =>
          startTransition(async () => {
            if (!v) return;
            const r = await updateLeadStatus(lead.id, v as LeadStatus);
            if (!r.ok) toast.error(r.error);
          })
        }
      >
        <SelectTrigger className="h-10 w-auto min-w-36 font-medium" aria-label="Lead status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(LEAD_STATUS_LABELS).map(([v, label]) => (
            <SelectItem key={v} value={v}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={lead.temperature}
        disabled={pending}
        onValueChange={(v) =>
          startTransition(async () => {
            if (!v) return;
            const r = await updateLeadTemperature(lead.id, v as LeadTemperature);
            if (!r.ok) toast.error(r.error);
          })
        }
      >
        <SelectTrigger className="h-10 w-auto" aria-label="Lead temperature">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(TEMPERATURE_LABELS).map(([v, label]) => (
            <SelectItem key={v} value={v}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {lead.temperature !== "hot" && (
        <Button
          variant="outline"
          disabled={pending}
          className={cn("h-10 gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-950")}
          onClick={() =>
            startTransition(async () => {
              const r = await updateLeadTemperature(lead.id, "hot");
              if (r.ok) toast.success("Marked as hot lead");
              else toast.error(r.error);
            })
          }
        >
          <Flame className="size-4" aria-hidden /> Mark hot
        </Button>
      )}

      {canAssign && (
        <Select
          value={lead.assigned_agent_id ?? undefined}
          disabled={pending}
          onValueChange={(v) =>
            startTransition(async () => {
              if (!v) return;
              const r = await assignLeadAgent(lead.id, v);
              if (r.ok) toast.success("Lead reassigned");
              else toast.error(r.error);
            })
          }
        >
          <SelectTrigger className="h-10 w-auto min-w-32" aria-label="Assigned agent">
            <SelectValue placeholder="Assign agent" />
          </SelectTrigger>
          <SelectContent>
            {agents.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
