"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, requireProfile } from "@/lib/supabase/server";
import { propertyFormSchema } from "@/lib/validations";
import type { ActionState, PropertyAvailability } from "@/lib/types";

function splitList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function createProperty(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireProfile();
  const parsed = propertyFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  const supabase = await createClient();
  const { data: property, error } = await supabase
    .from("properties")
    .insert({
      organization_id: profile.organization_id,
      title: d.title,
      location: d.location,
      address: d.address || null,
      property_type: d.propertyType,
      price: d.price,
      size_sqft: d.sizeSqft === "" || d.sizeSqft === undefined ? null : d.sizeSqft,
      bedrooms: d.bedrooms === "" || d.bedrooms === undefined ? null : d.bedrooms,
      bathrooms: d.bathrooms === "" || d.bathrooms === undefined ? null : d.bathrooms,
      floor: d.floor || null,
      furnishing: d.furnishing || null,
      availability: d.availability,
      description: d.description || null,
      amenities: splitList(d.amenities),
      tags: splitList(d.tags),
      units_available: d.unitsAvailable,
      owner_name: d.ownerName || null,
      owner_phone: d.ownerPhone || null,
      developer_name: d.developerName || null,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error || !property) return { ok: false, error: error?.message ?? "Failed to create" };

  // Attach any images uploaded to storage by the client before submit
  const imageUrls = formData.getAll("imageUrls[]").map(String).filter(Boolean);
  const imagePaths = formData.getAll("imagePaths[]").map(String);
  if (imageUrls.length) {
    await supabase.from("property_images").insert(
      imageUrls.map((url, i) => ({
        organization_id: profile.organization_id,
        property_id: property.id,
        url,
        storage_path: imagePaths[i] || null,
        is_cover: i === 0,
        sort_order: i,
      }))
    );
  }

  revalidatePath("/properties");
  redirect(`/properties/${property.id}`);
}

export async function updateProperty(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireProfile();
  const propertyId = formData.get("propertyId") as string;
  if (!propertyId) return { ok: false, error: "Missing property" };
  const parsed = propertyFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("properties")
    .update({
      title: d.title,
      location: d.location,
      address: d.address || null,
      property_type: d.propertyType,
      price: d.price,
      size_sqft: d.sizeSqft === "" || d.sizeSqft === undefined ? null : d.sizeSqft,
      bedrooms: d.bedrooms === "" || d.bedrooms === undefined ? null : d.bedrooms,
      bathrooms: d.bathrooms === "" || d.bathrooms === undefined ? null : d.bathrooms,
      floor: d.floor || null,
      furnishing: d.furnishing || null,
      availability: d.availability,
      description: d.description || null,
      amenities: splitList(d.amenities),
      tags: splitList(d.tags),
      units_available: d.unitsAvailable,
      owner_name: d.ownerName || null,
      owner_phone: d.ownerPhone || null,
      developer_name: d.developerName || null,
    })
    .eq("id", propertyId);
  if (error) return { ok: false, error: error.message };

  const imageUrls = formData.getAll("imageUrls[]").map(String).filter(Boolean);
  const imagePaths = formData.getAll("imagePaths[]").map(String);
  if (imageUrls.length) {
    const { count } = await supabase
      .from("property_images")
      .select("id", { count: "exact", head: true })
      .eq("property_id", propertyId);
    await supabase.from("property_images").insert(
      imageUrls.map((url, i) => ({
        organization_id: profile.organization_id,
        property_id: propertyId,
        url,
        storage_path: imagePaths[i] || null,
        is_cover: (count ?? 0) === 0 && i === 0,
        sort_order: (count ?? 0) + i,
      }))
    );
  }

  revalidatePath("/properties");
  revalidatePath(`/properties/${propertyId}`);
  return { ok: true, message: "Property updated" };
}

export async function updateAvailability(
  propertyId: string,
  availability: PropertyAvailability
): Promise<ActionState> {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("properties")
    .update({ availability })
    .eq("id", propertyId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/properties");
  revalidatePath(`/properties/${propertyId}`);
  return { ok: true };
}

export async function deletePropertyImage(imageId: string): Promise<ActionState> {
  await requireProfile();
  const supabase = await createClient();
  const { data: img, error } = await supabase
    .from("property_images")
    .delete()
    .eq("id", imageId)
    .select("property_id, storage_path")
    .single();
  if (error) return { ok: false, error: error.message };
  if (img?.storage_path) {
    await supabase.storage.from("property-images").remove([img.storage_path]);
  }
  if (img) revalidatePath(`/properties/${img.property_id}`);
  return { ok: true };
}

export async function addPropertyDocument(
  propertyId: string,
  name: string,
  url: string,
  storagePath: string
): Promise<ActionState> {
  const profile = await requireProfile();
  if (!name.trim() || !url) return { ok: false, error: "Invalid document" };

  const supabase = await createClient();
  const { error } = await supabase.from("property_documents").insert({
    organization_id: profile.organization_id,
    property_id: propertyId,
    name: name.trim().slice(0, 200),
    url,
    storage_path: storagePath,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/properties/${propertyId}`);
  return { ok: true };
}

export async function deletePropertyDocument(documentId: string): Promise<ActionState> {
  await requireProfile();
  const supabase = await createClient();
  const { data: doc, error } = await supabase
    .from("property_documents")
    .delete()
    .eq("id", documentId)
    .select("property_id, storage_path")
    .single();
  if (error) return { ok: false, error: error.message };
  if (doc?.storage_path) {
    await supabase.storage.from("property-docs").remove([doc.storage_path]);
  }
  if (doc) revalidatePath(`/properties/${doc.property_id}`);
  return { ok: true };
}

export async function deleteProperty(propertyId: string): Promise<ActionState> {
  const profile = await requireProfile();
  if (!["admin", "sales_manager"].includes(profile.role)) {
    return { ok: false, error: "Only managers can delete properties" };
  }
  const supabase = await createClient();

  const { data: images } = await supabase
    .from("property_images")
    .select("storage_path")
    .eq("property_id", propertyId);

  const { error } = await supabase.from("properties").delete().eq("id", propertyId);
  if (error) return { ok: false, error: error.message };

  const paths = (images ?? []).map((i) => i.storage_path).filter(Boolean) as string[];
  if (paths.length) await supabase.storage.from("property-images").remove(paths);

  revalidatePath("/properties");
  redirect("/properties");
}
