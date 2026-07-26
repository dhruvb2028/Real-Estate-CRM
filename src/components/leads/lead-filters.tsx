"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
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

const STATUS_CHIPS = [
  "new",
  "call_pending",
  "contacted",
  "interested",
  "site_visit_scheduled",
  "negotiation",
  "won",
] as const;

export function LeadFilters({
  agents,
}: {
  agents: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [sheetOpen, setSheetOpen] = useState(false);
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
  const secondaryKeys = ["source", "temperature", "agent"] as const;
  const activeSecondary = secondaryKeys.filter((k) => searchParams.get(k)).length;
  const hasFilters = activeSecondary > 0 || !!activeStatus || !!searchParams.get("q");

  const selects = (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="f-source">Source</Label>
        <Select
          value={searchParams.get("source") ?? "all"}
          onValueChange={(v) => setParam("source", !v || v === "all" ? null : v)}
        >
          <SelectTrigger id="f-source" className="w-full">
            <SelectValue placeholder="All sources" />
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
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="f-temp">Temperature</Label>
        <Select
          value={searchParams.get("temperature") ?? "all"}
          onValueChange={(v) => setParam("temperature", !v || v === "all" ? null : v)}
        >
          <SelectTrigger id="f-temp" className="w-full">
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any temperature</SelectItem>
            {Object.entries(TEMPERATURE_LABELS).map(([v, label]) => (
              <SelectItem key={v} value={v}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="f-agent">Agent</Label>
        <Select
          value={searchParams.get("agent") ?? "all"}
          onValueChange={(v) => setParam("agent", !v || v === "all" ? null : v)}
        >
          <SelectTrigger id="f-agent" className="w-full">
            <SelectValue placeholder="All agents" />
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
      </div>
    </>
  );

  return (
    <div className="sticky top-14 z-30 -mx-4 space-y-2.5 bg-background/95 px-4 pb-2.5 pt-1 backdrop-blur md:static md:mx-0 md:bg-transparent md:px-0 md:backdrop-blur-none">
      {/* Search + filter trigger */}
      <div className="flex gap-2">
        <div className="relative flex-1">
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
            type="search"
            enterKeyHint="search"
            placeholder="Search name, phone, location…"
            className="h-11 rounded-xl pl-9"
            aria-label="Search leads"
          />
        </div>
        <Button
          variant="outline"
          className="relative size-11 shrink-0 rounded-xl md:hidden"
          aria-label={`Filters${activeSecondary ? ` (${activeSecondary} active)` : ""}`}
          onClick={() => setSheetOpen(true)}
        >
          <SlidersHorizontal className="size-4.5" aria-hidden />
          {activeSecondary > 0 && (
            <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-gold-foreground">
              {activeSecondary}
            </span>
          )}
        </Button>
      </div>

      {/* Fast status chips */}
      <div className="no-scrollbar snap-x-mandatory -mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 md:mx-0 md:px-0">
        <button
          onClick={() => setParam("status", null)}
          className={cn(
            "h-9 shrink-0 snap-start cursor-pointer rounded-full border px-4 text-[13px] font-semibold transition-colors",
            !activeStatus
              ? "border-transparent bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground"
          )}
        >
          All
        </button>
        {STATUS_CHIPS.map((s) => (
          <button
            key={s}
            onClick={() => setParam("status", activeStatus === s ? null : s)}
            className={cn(
              "h-9 shrink-0 snap-start cursor-pointer whitespace-nowrap rounded-full border px-4 text-[13px] font-semibold transition-colors",
              activeStatus === s
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground"
            )}
          >
            {LEAD_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Desktop inline selects */}
      <div className="hidden flex-wrap items-end gap-3 md:flex">
        {selects}
        {hasFilters && (
          <Button
            variant="ghost"
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

      {/* Mobile filter sheet */}
      <Drawer open={sheetOpen} onOpenChange={setSheetOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-lg px-4 pb-8">
            <DrawerHeader className="px-0">
              <DrawerTitle>Filter leads</DrawerTitle>
              <DrawerDescription>Narrow down your pipeline</DrawerDescription>
            </DrawerHeader>
            <div className="space-y-4">
              {selects}
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  className="h-12 flex-1"
                  onClick={() => {
                    setQ("");
                    startTransition(() => router.replace("/leads", { scroll: false }));
                    setSheetOpen(false);
                  }}
                >
                  Clear all
                </Button>
                <Button className="h-12 flex-1" onClick={() => setSheetOpen(false)}>
                  Show results
                </Button>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
