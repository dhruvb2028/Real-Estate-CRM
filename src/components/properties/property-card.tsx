import Link from "next/link";
import { Bath, BedDouble, Building2, MapPin, Ruler } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AVAILABILITY_COLORS,
  AVAILABILITY_LABELS,
  PROPERTY_TYPE_LABELS,
  formatPrice,
} from "@/lib/constants";
import type { PropertyWithImages } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Image-first estate card with gradient overlay and gold price chip. */
export function PropertyCard({ property }: { property: PropertyWithImages }) {
  const cover = property.property_images?.[0];

  return (
    <Link href={`/properties/${property.id}`} className="group block">
      <article className="card-lift relative h-64 overflow-hidden rounded-2xl border border-border bg-card">
        {/* Cover */}
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover.url}
            alt={property.title}
            loading="lazy"
            className="absolute inset-0 size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
          />
        ) : (
          <div className="bg-luxe absolute inset-0 flex items-center justify-center">
            <Building2 className="size-12 text-white/20" aria-hidden />
          </div>
        )}
        {/* Legibility gradient */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-[oklch(0.13_0.008_60/0.92)] via-[oklch(0.15_0.008_60/0.35)] to-transparent"
          aria-hidden
        />

        {/* Top row */}
        <div className="absolute inset-x-3 top-3 flex items-start justify-between">
          <Badge
            className={cn(
              "border-0 shadow-md backdrop-blur",
              AVAILABILITY_COLORS[property.availability]
            )}
          >
            {AVAILABILITY_LABELS[property.availability]}
          </Badge>
          <span className="rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
            {PROPERTY_TYPE_LABELS[property.property_type]}
          </span>
        </div>

        {/* Bottom content */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="text-gold-gradient text-xl font-bold tracking-tight">
            {formatPrice(property.price)}
          </p>
          <h3 className="font-display mt-0.5 truncate text-lg font-semibold text-white">
            {property.title}
          </h3>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-white/65">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            {property.location}
          </p>
          <div className="mt-2.5 flex items-center gap-3 text-[11.5px] font-medium text-white/75">
            {property.bedrooms != null && property.bedrooms > 0 && (
              <span className="flex items-center gap-1">
                <BedDouble className="size-3.5" aria-hidden />
                {property.bedrooms} Beds
              </span>
            )}
            {property.bathrooms != null && property.bathrooms > 0 && (
              <span className="flex items-center gap-1">
                <Bath className="size-3.5" aria-hidden />
                {property.bathrooms} Baths
              </span>
            )}
            {property.size_sqft && (
              <span className="flex items-center gap-1">
                <Ruler className="size-3.5" aria-hidden />
                {Number(property.size_sqft).toLocaleString("en-IN")} sqft
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
