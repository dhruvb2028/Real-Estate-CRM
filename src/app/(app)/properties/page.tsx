import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Building2, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PropertyCard } from "@/components/properties/property-card";
import { PropertyFilters } from "@/components/properties/property-filters";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getProperties,
  type PropertyFilters as Filters,
} from "@/server/queries/properties";

export const metadata: Metadata = { title: "Properties" };
export const dynamic = "force-dynamic";

async function PropertyList({ filters }: { filters: Filters }) {
  const properties = await getProperties(filters);

  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
        <Building2 className="mb-3 size-10 text-muted-foreground/50" aria-hidden />
        <p className="font-semibold">No properties found</p>
        <p className="mb-4 mt-1 max-w-xs text-sm text-muted-foreground">
          Adjust filters or add your first listing to start sharing with leads.
        </p>
        <Button render={<Link href="/properties/new" />}>
          <Plus className="size-4" aria-hidden /> Add property
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {properties.map((p) => (
        <PropertyCard key={p.id} property={p} />
      ))}
    </div>
  );
}

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const filters: Filters = {
    q: params.q,
    type: params.type,
    availability: params.availability,
    minPrice: params.minPrice ? parseInt(params.minPrice, 10) : undefined,
    maxPrice: params.maxPrice ? parseInt(params.maxPrice, 10) : undefined,
  };

  return (
    <>
      <PageHeader
        title="Properties"
        action={
          <Button render={<Link href="/properties/new" />} className="h-10">
            <Plus className="size-4" aria-hidden /> Add property
          </Button>
        }
      />
      <div className="space-y-4">
        <Suspense>
          <PropertyFilters />
        </Suspense>
        <Suspense
          key={JSON.stringify(filters)}
          fallback={
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-60 rounded-xl" />
              ))}
            </div>
          }
        >
          <PropertyList filters={filters} />
        </Suspense>
      </div>
    </>
  );
}
