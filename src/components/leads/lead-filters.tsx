"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
  TEMPERATURE_LABELS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

const STATUS_CHIPS = ["new", "call_pending", "contacted", "interested", "site_visit_scheduled", "negotiation", "won"] as const;

export function LeadFilters({
  agents,
}: {
  agents: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => router.replace(`/leads?${params.toString()}`, { scroll: false }));
  }

  useEffect(() => {
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, []);

  const activeStatus = searchParams.get("status");
  const hasFilters = ["status", "source", "temperature", "agent", "q"].some((k) =>
    searchParams.get(k)
  );

  return (
    <div className="space-y-2.5">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (debounce.current) clearTimeout(debounce.current);
            debounce.current = setTimeout(() => setParam("q", e.target.value || null), 350);
          }}
          placeholder="Search name, phone, email, location…"
          className="h-11 pl-9"
          aria-label="Search leads"
        />
      </div>

      {/* Fast status chips */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5">
        <button
          onClick={() => setParam("status", null)}
          className={cn(
            "h-9 shrink-0 cursor-pointer rounded-full border px-3.5 text-sm font-medium transition-colors",
            !activeStatus
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:text-foreground"
          )}
        >
          All
        </button>
        {STATUS_CHIPS.map((s) => (
          <button
            key={s}
            onClick={() => setParam("status", activeStatus === s ? null : s)}
            className={cn(
              "h-9 shrink-0 cursor-pointer rounded-full border px-3.5 text-sm font-medium transition-colors",
              activeStatus === s
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {LEAD_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Secondary filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={searchParams.get("source") ?? "all"}
          onValueChange={(v) => setParam("source", v === "all" ? null : v)}
        >
          <SelectTrigger className="h-9 w-auto min-w-28 text-sm" aria-label="Filter by source">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {Object.entries(LEAD_SOURCE_LABELS).map(([v, label]) => (
              <SelectItem key={v} value={v}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("temperature") ?? "all"}
          onValueChange={(v) => setParam("temperature", v === "all" ? null : v)}
        >
          <SelectTrigger className="h-9 w-auto min-w-24 text-sm" aria-label="Filter by temperature">
            <SelectValue placeholder="Temp" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any temp</SelectItem>
            {Object.entries(TEMPERATURE_LABELS).map(([v, label]) => (
              <SelectItem key={v} value={v}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("agent") ?? "all"}
          onValueChange={(v) => setParam("agent", v === "all" ? null : v)}
        >
          <SelectTrigger className="h-9 w-auto min-w-28 text-sm" aria-label="Filter by agent">
            <SelectValue placeholder="Agent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All agents</SelectItem>
            {agents.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1 text-muted-foreground"
            onClick={() => {
              setQ("");
              startTransition(() => router.replace("/leads", { scroll: false }));
            }}
          >
            <X className="size-3.5" aria-hidden /> Clear
          </Button>
        )}
      </div>
    </div>
  );
}
