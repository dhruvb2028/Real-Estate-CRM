import type { Metadata } from "next";
import { requireProfile } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { NotificationsList } from "@/components/notifications/notifications-list";
import type { AppNotification } from "@/lib/types";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Notifications" description="Everything that needs your attention" />
      <NotificationsList
        initial={(data as AppNotification[]) ?? []}
        userId={profile.id}
      />
    </div>
  );
}
