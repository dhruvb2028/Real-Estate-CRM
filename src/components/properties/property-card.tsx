import Link from "next/link";
import { Bath, BedDouble, Building2, MapPin, Ruler } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AVAILABILITY_COLORS,
  AVAILABILITY_LABELS,
  PROPERTY_TYPE_LABELS,
  formatPrice,
} from "@/lib/constants";
import type { PropertyWithImages } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PropertyCard({ property }: { property: PropertyWithImages }) {
  const cover = property.property_images?.[0];

  return (
    <Link href={`/properties/${property.id}`} className="block">
      <Card className="gap-0 overflow-hidden p-0 transition-shadow hover:shadow-md">
        <div className="relative h-40 bg-primary/5">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover.url}
              alt={property.title}
              loading="lazy"
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <Building2 className="size-10 text-primary/30" aria-hidden />
            </div>
          )}
          <Badge
            className={cn(
              "absolute left-2.5 top-2.5 border-0 shadow-sm",
              AVAILABILITY_COLORS[property.availability]
            )}
          >
            {AVAILABILITY_LABELS[property.availability]}
          </Badge>
        </div>

        <div className="space-y-1.5 p-3.5">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-semibold">{property.title}</p>
            <p className="shrink-0 font-bold text-primary">{formatPrice(property.price)}</p>
          </div>
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            {property.location}
          </p>
          <div className="flex items-center gap-3 pt-0.5 text-xs text-muted-foreground">
            <span className="rounded bg-muted px-1.5 py-0.5 font-medium">
              {PROPERTY_TYPE_LABELS[property.property_type]}
            </span>
            {property.bedrooms != null && property.bedrooms > 0 && (
              <span className="flex items-center gap-1">
                <BedDouble className="size-3.5" aria-hidden />
                {property.bedrooms}
              </span>
            )}
            {property.bathrooms != null && property.bathrooms > 0 && (
              <span className="flex items-center gap-1">
                <Bath className="size-3.5" aria-hidden />
                {property.bathrooms}
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
      </Card>
    </Link>
  );
}
