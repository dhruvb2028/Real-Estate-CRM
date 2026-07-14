"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/supabase/server";
import { attendanceService } from "@/services/attendanceService";
import type { ActionState } from "@/lib/types";

export async function checkIn(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireProfile();
  const lat = formData.get("latitude") ? Number(formData.get("latitude")) : null;
  const lng = formData.get("longitude") ? Number(formData.get("longitude")) : null;
  const notes = (formData.get("notes") as string) || null;
  const selfieUrl = (formData.get("selfieUrl") as string) || null;

  const result = await attendanceService.checkIn({
    orgId: profile.organization_id!,
    userId: profile.id,
    latitude: lat,
    longitude: lng,
    selfieUrl,
    notes,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/attendance");
  return {
    ok: true,
    message:
      result.data?.status === "late"
        ? "Checked in (marked late)"
        : "Checked in — have a great day!",
  };
}

export async function checkOut(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireProfile();
  const lat = formData.get("latitude") ? Number(formData.get("latitude")) : null;
  const lng = formData.get("longitude") ? Number(formData.get("longitude")) : null;
  const notes = (formData.get("notes") as string) || null;

  const result = await attendanceService.checkOut({
    orgId: profile.organization_id!,
    userId: profile.id,
    latitude: lat,
    longitude: lng,
    notes,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/attendance");
  return { ok: true, message: "Checked out — see you tomorrow!" };
}
