import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Bath,
  BedDouble,
  ExternalLink,
  MapPin,
  Pencil,
  Phone,
  Ruler,
  Layers,
  Sofa,
} from "lucide-react";
import { requireProfile } from "@/lib/supabase/server";
import { getLeadsForShare, getProperty } from "@/server/queries/properties";
import { PropertyGallery } from "@/components/properties/gallery";
import { ShareWithLead } from "@/components/properties/share-with-lead";
import { AvailabilitySelect } from "@/components/properties/availability-select";
import { DeleteProperty } from "@/components/properties/delete-property";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FURNISHING_LABELS,
  PROPERTY_TYPE_LABELS,
  formatPrice,
} from "@/lib/constants";

export const metadata: Metadata = { title: "Property" };
export const dynamic = "force-dynamic";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [profile, property] = await Promise.all([requireProfile(), getProperty(id)]);
  if (!property) notFound();

  const leads = await getLeadsForShare();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const shareUrl = `${appUrl.replace(/\/$/, "")}/p/${property.share_token}`;
  const canDelete = ["admin", "sales_manager"].includes(profile.role);

  const facts = [
    property.bedrooms != null && property.bedrooms > 0
      ? { icon: BedDouble, label: `${property.bedrooms} Beds` }
      : null,
    property.bathrooms != null && property.bathrooms > 0
      ? { icon: Bath, label: `${property.bathrooms} Baths` }
      : null,
    property.size_sqft
      ? { icon: Ruler, label: `${Number(property.size_sqft).toLocaleString("en-IN")} sqft` }
      : null,
    property.floor ? { icon: Layers, label: `Floor ${property.floor}` } : null,
    property.furnishing
      ? { icon: Sofa, label: FURNISHING_LABELS[property.furnishing] }
      : null,
  ].filter(Boolean) as { icon: typeof BedDouble; label: string }[];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader
        title={property.title}
        description={property.location}
        action={
          <Button variant="outline" render={<Link href={`/properties/${property.id}/edit`} />} className="h-10">
            <Pencil className="size-4" aria-hidden /> Edit
          </Button>
        }
      />

      <PropertyGallery images={property.property_images} title={property.title} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-2xl font-bold text-primary">{formatPrice(property.price)}</p>
        <AvailabilitySelect propertyId={property.id} value={property.availability} />
      </div>

      <ShareWithLead propertyId={property.id} shareUrl={shareUrl} leads={leads} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{PROPERTY_TYPE_LABELS[property.property_type]}</Badge>
            {property.units_available > 0 && (
              <Badge variant="outline">{property.units_available} unit(s) available</Badge>
            )}
            {property.tags.map((t) => (
              <Badge key={t} variant="outline">
                {t}
              </Badge>
            ))}
          </div>

          {facts.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {facts.map(({ icon: Icon, label }) => (
                <p
                  key={label}
                  className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 font-medium"
                >
                  <Icon className="size-4 text-primary" aria-hidden />
                  {label}
                </p>
              ))}
            </div>
          )}

          {property.address && (
            <p className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
              {property.address}
            </p>
          )}

          {property.description && (
            <p className="whitespace-pre-wrap text-muted-foreground">{property.description}</p>
          )}

          {property.amenities.length > 0 && (
            <div>
              <p className="mb-1.5 font-semibold">Amenities</p>
              <div className="flex flex-wrap gap-1.5">
                {property.amenities.map((a) => (
                  <Badge key={a} variant="secondary" className="font-normal">
                    {a}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {(property.owner_name || property.developer_name) && (
            <div className="rounded-lg border border-border p-3">
              <p className="mb-1 font-semibold">
                {property.developer_name ? "Developer" : "Owner"}
              </p>
              <p className="text-muted-foreground">
                {property.developer_name ?? property.owner_name}
              </p>
              {property.owner_phone && (
                <a
                  href={`tel:${property.owner_phone}`}
                  className="mt-1 flex items-center gap-1.5 font-medium text-primary"
                >
                  <Phone className="size-3.5" aria-hidden />
                  {property.owner_phone}
                </a>
              )}
            </div>
          )}

          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 font-medium text-primary hover:underline"
          >
            <ExternalLink className="size-4" aria-hidden />
            View public share page
          </a>
        </CardContent>
      </Card>

      {canDelete && (
        <div className="flex justify-end">
          <DeleteProperty propertyId={property.id} title={property.title} />
        </div>
      )}
    </div>
  );
}
