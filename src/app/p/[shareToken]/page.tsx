import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Bath,
  BedDouble,
  Building2,
  FileText,
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
  documents?: { name: string; url: string }[];
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
      <header className="bg-luxe">
        <div className="mx-auto flex max-w-3xl items-center gap-2.5 px-4 py-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.8_0.13_90)] to-[oklch(0.58_0.13_80)]">
            <Building2 className="size-4.5 text-[oklch(0.2_0.02_60)]" aria-hidden />
          </div>
          <div>
            <p className="font-display text-lg font-semibold tracking-tight text-white">
              {property.organization_name}
            </p>
            <p className="text-[11px] uppercase tracking-[0.16em] text-gold">
              Curated for you
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-5 pb-28">
        <PublicGallery images={property.images} title={property.title} />

        <div>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-tight">
                {property.title}
              </h1>
              <p className="mt-1.5 flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="size-4" aria-hidden />
                {property.address ?? property.location}
              </p>
            </div>
            <div className="text-right">
              <p className="text-gold-gradient text-3xl font-bold tracking-tight">
                {formatPrice(property.price)}
              </p>
              <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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

        {(property.documents?.length ?? 0) > 0 && (
          <section>
            <h2 className="mb-2 text-lg font-semibold">Brochures & documents</h2>
            <ul className="space-y-2">
              {property.documents!.map((doc) => (
                <li key={doc.url}>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-accent"
                  >
                    <FileText className="size-4.5 shrink-0 text-primary" aria-hidden />
                    <span className="truncate">{doc.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      {property.organization_phone && (
        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-card/95 p-3 backdrop-blur pb-safe">
          <div className="mx-auto max-w-3xl">
            <a
              href={`tel:${property.organization_phone}`}
              className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[oklch(0.78_0.13_90)] to-[oklch(0.64_0.14_82)] text-base font-bold text-[oklch(0.2_0.03_70)] shadow-[0_8px_24px_-6px_oklch(0.686_0.135_85/55%)] transition-all duration-200 hover:brightness-105 active:scale-[0.98]"
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
