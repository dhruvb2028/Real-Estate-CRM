import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PropertyWithImages } from "@/lib/types";

export interface PropertyFilters {
  q?: string;
  type?: string;
  availability?: string;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
}

export async function getProperties(
  filters: PropertyFilters
): Promise<PropertyWithImages[]> {
  const supabase = await createClient();
  let query = supabase
    .from("properties")
    .select("*, property_images(*)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (filters.q) {
    const q = filters.q.replace(/[%_,]/g, " ").trim();
    if (q) {
      query = query.or(`title.ilike.%${q}%,location.ilike.%${q}%,description.ilike.%${q}%`);
    }
  }
  if (filters.type) query = query.eq("property_type", filters.type);
  if (filters.availability) query = query.eq("availability", filters.availability);
  if (filters.minPrice) query = query.gte("price", filters.minPrice);
  if (filters.maxPrice) query = query.lte("price", filters.maxPrice);
  if (filters.location) query = query.ilike("location", `%${filters.location}%`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data as unknown as PropertyWithImages[]) ?? [];
  for (const p of rows) {
    p.property_images?.sort((a, b) =>
      a.is_cover === b.is_cover ? a.sort_order - b.sort_order : a.is_cover ? -1 : 1
    );
  }
  return rows;
}

export interface PropertyDetail extends PropertyWithImages {
  property_documents: import("@/lib/types").PropertyDocument[];
}

export async function getProperty(id: string): Promise<PropertyDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select("*, property_images(*), property_documents(*)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const p = data as unknown as PropertyDetail;
  p.property_images?.sort((a, b) =>
    a.is_cover === b.is_cover ? a.sort_order - b.sort_order : a.is_cover ? -1 : 1
  );
  return p;
}

export async function getLeadsForShare(): Promise<
  { id: string; full_name: string; phone: string; email: string | null }[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select("id, full_name, phone, email")
    .not("status", "in", "(won,lost)")
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}
