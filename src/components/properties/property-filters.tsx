"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useTransition } from "react";
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
import { AVAILABILITY_LABELS, PROPERTY_TYPE_LABELS } from "@/lib/constants";

const BUDGETS = [
  { label: "Under ₹50L", min: 0, max: 5000000 },
  { label: "₹50L – 1Cr", min: 5000000, max: 10000000 },
  { label: "₹1 – 2Cr", min: 10000000, max: 20000000 },
  { label: "₹2Cr+", min: 20000000, max: 0 },
];

export function PropertyFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    startTransition(() =>
      router.replace(`/properties?${params.toString()}`, { scroll: false })
    );
  }

  const budgetValue =
    BUDGETS.find(
      (b) =>
        String(b.min) === (searchParams.get("minPrice") ?? "0") &&
        String(b.max) === (searchParams.get("maxPrice") ?? "0")
    )?.label ?? "all";

  const hasFilters = ["q", "type", "availability", "minPrice", "maxPrice"].some((k) =>
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
            debounce.current = setTimeout(
              () => setParams({ q: e.target.value || null }),
              350
            );
          }}
          placeholder="Search title, location…"
          className="h-11 pl-9"
          aria-label="Search properties"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={searchParams.get("type") ?? "all"}
          onValueChange={(v) => setParams({ type: !v || v === "all" ? null : v })}
        >
          <SelectTrigger className="h-9 w-auto min-w-28 text-sm" aria-label="Property type">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(PROPERTY_TYPE_LABELS).map(([v, label]) => (
              <SelectItem key={v} value={v}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("availability") ?? "all"}
          onValueChange={(v) => setParams({ availability: !v || v === "all" ? null : v })}
        >
          <SelectTrigger className="h-9 w-auto min-w-28 text-sm" aria-label="Availability">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            {Object.entries(AVAILABILITY_LABELS).map(([v, label]) => (
              <SelectItem key={v} value={v}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={budgetValue}
          onValueChange={(v) => {
            const b = BUDGETS.find((x) => x.label === v);
            setParams({
              minPrice: b && b.min ? String(b.min) : null,
              maxPrice: b && b.max ? String(b.max) : null,
            });
          }}
        >
          <SelectTrigger className="h-9 w-auto min-w-28 text-sm" aria-label="Budget">
            <SelectValue placeholder="Budget" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any budget</SelectItem>
            {BUDGETS.map((b) => (
              <SelectItem key={b.label} value={b.label}>
                {b.label}
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
              startTransition(() => router.replace("/properties", { scroll: false }));
            }}
          >
            <X className="size-3.5" aria-hidden /> Clear
          </Button>
        )}
      </div>
    </div>
  );
}
