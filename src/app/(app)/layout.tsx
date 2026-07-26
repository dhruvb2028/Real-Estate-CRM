import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/server";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.organization_id) {
    redirect("/signup");
  }

  return (
    <div className="min-h-dvh bg-background">
      <Sidebar role={profile.role} />
      <div className="md:pl-60">
        <TopBar profile={profile} />
        {/* pb clears the floating bottom nav + home indicator on phones */}
        <main className="px-safe mx-auto w-full max-w-6xl pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 md:px-6 md:pb-10">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
