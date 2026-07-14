import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AttendanceRecord } from "@/lib/types";

export async function getMyAttendance(userId: string): Promise<{
  today: AttendanceRecord | null;
  history: AttendanceRecord[];
}> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from("attendance")
    .select("*")
    .eq("user_id", userId)
    .order("work_date", { ascending: false })
    .limit(30);

  const rows = (data as AttendanceRecord[]) ?? [];
  return {
    today: rows.find((r) => r.work_date === today) ?? null,
    history: rows,
  };
}

export async function getTeamAttendanceToday(): Promise<{
  records: AttendanceRecord[];
  teamSize: number;
}> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: records }, { count }] = await Promise.all([
    supabase
      .from("attendance")
      .select("*, user:profiles!attendance_user_id_fkey(id, full_name, avatar_url, role)")
      .eq("work_date", today)
      .order("check_in_time", { ascending: true }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

  return {
    records: (records as unknown as AttendanceRecord[]) ?? [],
    teamSize: count ?? 0,
  };
}
