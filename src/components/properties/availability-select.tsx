"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateAvailability } from "@/server/actions/properties";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AVAILABILITY_LABELS } from "@/lib/constants";
import type { PropertyAvailability } from "@/lib/types";

export function AvailabilitySelect({
  propertyId,
  value,
}: {
  propertyId: string;
  value: PropertyAvailability;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={value}
      disabled={pending}
      onValueChange={(v) =>
        startTransition(async () => {
          if (!v) return;
          const r = await updateAvailability(propertyId, v as PropertyAvailability);
          if (r.ok) toast.success("Availability updated");
          else toast.error(r.error);
        })
      }
    >
      <SelectTrigger className="h-10 w-auto min-w-32 font-medium" aria-label="Availability">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(AVAILABILITY_LABELS).map(([v, label]) => (
          <SelectItem key={v} value={v}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
