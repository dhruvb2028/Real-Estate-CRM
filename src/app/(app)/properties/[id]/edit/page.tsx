import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/supabase/server";
import { getProperty } from "@/server/queries/properties";
import { PageHeader } from "@/components/layout/page-header";
import { PropertyForm } from "@/components/properties/property-form";
import { ImageManager } from "@/components/properties/image-manager";

export const metadata: Metadata = { title: "Edit property" };

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [profile, property] = await Promise.all([requireProfile(), getProperty(id)]);
  if (!property) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PageHeader title="Edit property" description={property.title} />
      {property.property_images.length > 0 && (
        <ImageManager images={property.property_images} />
      )}
      <PropertyForm orgId={profile.organization_id!} property={property} />
    </div>
  );
}
