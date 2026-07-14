import type { Metadata } from "next";
import { formatDistanceToNow } from "date-fns";
import { requireProfile } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { InviteDialog } from "@/components/team/invite-dialog";
import { MemberRow } from "@/components/team/member-row";
import { RevokeInviteButton } from "@/components/team/revoke-invite";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/constants";
import type { Profile, TeamInvite } from "@/lib/types";

export const metadata: Metadata = { title: "Team" };
export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const isAdmin = profile.role === "admin";

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at"),
    isAdmin
      ? supabase
          .from("team_members")
          .select("*")
          .eq("status", "pending")
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const pendingInvites = (invites ?? []) as TeamInvite[];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Team"
        description={`${members?.length ?? 0} member(s)`}
        action={isAdmin ? <InviteDialog /> : undefined}
      />

      <Card>
        <CardContent className="pt-2">
          <ul className="divide-y divide-border">
            {((members ?? []) as Profile[]).map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                isSelf={m.id === profile.id}
                canManage={isAdmin}
              />
            ))}
          </ul>
        </CardContent>
      </Card>

      {isAdmin && pendingInvites.length > 0 && (
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pending invites</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {pendingInvites.map((inv) => (
                <li key={inv.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_LABELS[inv.role]} · expires{" "}
                      {formatDistanceToNow(new Date(inv.expires_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Badge variant="secondary">Pending</Badge>
                  <RevokeInviteButton inviteId={inv.id} email={inv.email} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
