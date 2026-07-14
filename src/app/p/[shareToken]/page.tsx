import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Bath,
  BedDouble,
  Building2,
  MapPin,
  Phone,
  Ruler,
  Sofa,
  Layers,
} from "lucide-react";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { PublicGallery } from "./public-gallery";
import {
  AVAILABILITY_LABELS,
  FURNISHING_LABELS,
  PROPERTY_TYPE_LABELS,
  formatPrice,
} from "@/lib/constants";
import type {
  FurnishingStatus,
  PropertyAvailability,
  PropertyType,
} from "@/lib/types";

export const dynamic = "force-dynamic";

interface PublicProperty {
  id: string;
  title: string;
  location: string;
  address: string | null;
  property_type: PropertyType;
  price: number;
  size_sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor: string | null;
  furnishing: FurnishingStatus | null;
  availability: PropertyAvailability;
  description: string | null;
  amenities: string[];
  organization_name: string;
  organization_phone: string | null;
  images: { url: string; is_cover: boolean }[];
}

async function getPublicProperty(token: string): Promise<PublicProperty | null> {
  // Anon client — access goes through the security-definer RPC only.
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const { data } = await supabase.rpc("get_public_property", { p_share_token: token });
  return (data as PublicProperty | null) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}): Promise<Metadata> {
  const { shareToken } = await params;
  const property = await getPublicProperty(shareToken);
  if (!property) return { title: "Property not found" };
  return {
    title: `${property.title} · ${property.location}`,
    description: property.description?.slice(0, 150),
    openGraph: {
      title: property.title,
      description: `${PROPERTY_TYPE_LABELS[property.property_type]} in ${property.location} — ${formatPrice(property.price)}`,
      images: property.images[0]?.url ? [property.images[0].url] : [],
    },
  };
}

export default async function PublicPropertyPage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;
  const property = await getPublicProperty(shareToken);
  if (!property) notFound();

  const facts = [
    property.bedrooms
      ? { icon: BedDouble, label: `${property.bedrooms} Bedrooms` }
      : null,
    property.bathrooms ? { icon: Bath, label: `${property.bathrooms} Bathrooms` } : null,
    property.size_sqft
      ? { icon: Ruler, label: `${Number(property.size_sqft).toLocaleString("en-IN")} sqft` }
      : null,
    property.floor ? { icon: Layers, label: `Floor ${property.floor}` } : null,
    property.furnishing
      ? { icon: Sofa, label: FURNISHING_LABELS[property.furnishing] }
      : null,
  ].filter(Boolean) as { icon: typeof BedDouble; label: string }[];

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="size-4.5" aria-hidden />
          </div>
          <p className="font-bold tracking-tight">{property.organization_name}</p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-5 pb-28">
        <PublicGallery images={property.images} title={property.title} />

        <div>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{property.title}</h1>
              <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="size-4" aria-hidden />
                {property.address ?? property.location}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{formatPrice(property.price)}</p>
              <p className="text-xs font-medium text-muted-foreground">
                {PROPERTY_TYPE_LABELS[property.property_type]} ·{" "}
                {AVAILABILITY_LABELS[property.availability]}
              </p>
            </div>
          </div>
        </div>

        {facts.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {facts.map(({ icon: Icon, label }) => (
              <p
                key={label}
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-3 text-sm font-medium"
              >
                <Icon className="size-4.5 text-primary" aria-hidden />
                {label}
              </p>
            ))}
          </div>
        )}

        {property.description && (
          <section>
            <h2 className="mb-1.5 text-lg font-semibold">About this property</h2>
            <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
              {property.description}
            </p>
          </section>
        )}

        {property.amenities.length > 0 && (
          <section>
            <h2 className="mb-2 text-lg font-semibold">Amenities</h2>
            <div className="flex flex-wrap gap-2">
              {property.amenities.map((a) => (
                <span
                  key={a}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-sm"
                >
                  {a}
                </span>
              ))}
            </div>
          </section>
        )}
      </main>

      {property.organization_phone && (
        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-card/95 p-3 backdrop-blur pb-safe">
          <div className="mx-auto max-w-3xl">
            <a
              href={`tel:${property.organization_phone}`}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Phone className="size-5" aria-hidden />
              Call {property.organization_name}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
