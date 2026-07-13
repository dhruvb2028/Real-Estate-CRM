import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { notificationService } from "@/services/notificationService";
import type { AttendanceStatus, ServiceResult } from "@/lib/types";

/**
 * Attendance rules: a check-in after the org's work_start_time (+ grace) is
 * "late"; a late check-in raises an attendance_issue notification to admins.
 */
const LATE_GRACE_MINUTES = 15;

export const attendanceService = {
  computeStatus(checkInISO: string, workStartTime: string | null): AttendanceStatus {
    if (!workStartTime) return "present";
    const checkIn = new Date(checkInISO);
    const [h, m] = workStartTime.split(":").map(Number);
    const threshold = new Date(checkIn);
    threshold.setHours(h, (m ?? 0) + LATE_GRACE_MINUTES, 0, 0);
    return checkIn > threshold ? "late" : "present";
  },

  async checkIn(input: {
    orgId: string;
    userId: string;
    latitude: number | null;
    longitude: number | null;
    selfieUrl?: string | null;
    notes?: string | null;
  }): Promise<ServiceResult<{ status: AttendanceStatus }>> {
    const admin = createAdminClient();
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    const { data: existing } = await admin
      .from("attendance")
      .select("id, check_in_time")
      .eq("user_id", input.userId)
      .eq("work_date", today)
      .maybeSingle();
    if (existing?.check_in_time) {
      return { ok: false, error: "Already checked in today" };
    }

    const { data: org } = await admin
      .from("organizations")
      .select("work_start_time")
      .eq("id", input.orgId)
      .single();

    const status = this.computeStatus(now, org?.work_start_time ?? null);

    const { error } = await admin.from("attendance").upsert(
      {
        organization_id: input.orgId,
        user_id: input.userId,
        work_date: today,
        check_in_time: now,
        check_in_latitude: input.latitude,
        check_in_longitude: input.longitude,
        selfie_url: input.selfieUrl ?? null,
        status,
        notes: input.notes ?? null,
      },
      { onConflict: "user_id,work_date" }
    );
    if (error) return { ok: false, error: error.message };

    if (status === "late") {
      const { data: user } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", input.userId)
        .single();
      await notificationService.notifyRoles(input.orgId, ["admin"], {
        type: "attendance_issue",
        title: "Late check-in",
        body: `${user?.full_name ?? "A team member"} checked in late today.`,
        link: "/attendance",
      });
    }

    return { ok: true, data: { status } };
  },

  async checkOut(input: {
    orgId: string;
    userId: string;
    latitude: number | null;
    longitude: number | null;
    notes?: string | null;
  }): Promise<ServiceResult> {
    const admin = createAdminClient();
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    const { data: existing } = await admin
      .from("attendance")
      .select("id, check_in_time, check_out_time, notes")
      .eq("user_id", input.userId)
      .eq("work_date", today)
      .maybeSingle();
    if (!existing?.check_in_time) return { ok: false, error: "Check in first" };
    if (existing.check_out_time) return { ok: false, error: "Already checked out today" };

    const { error } = await admin
      .from("attendance")
      .update({
        check_out_time: now,
        check_out_latitude: input.latitude,
        check_out_longitude: input.longitude,
        notes: input.notes?.trim()
          ? [existing.notes, input.notes.trim()].filter(Boolean).join("\n")
          : existing.notes,
      })
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },
};
