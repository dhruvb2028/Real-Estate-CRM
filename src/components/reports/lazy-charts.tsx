"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Recharts is ~100 kB gzipped — far too heavy to ship in the initial mobile
 * bundle. Loading it on demand keeps every other route light and lets the
 * reports page paint its numbers before the charts hydrate.
 */
const ChartFallback = ({ height = 200 }: { height?: number }) => (
  <Skeleton className="w-full rounded-xl" style={{ height }} />
);

export const CategoryBars = dynamic(
  () => import("./charts").then((m) => m.CategoryBars),
  { ssr: false, loading: () => <ChartFallback height={220} /> }
);

export const Donut = dynamic(() => import("./charts").then((m) => m.Donut), {
  ssr: false,
  loading: () => <ChartFallback height={240} />,
});
