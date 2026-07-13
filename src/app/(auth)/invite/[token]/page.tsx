import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLE_LABELS } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteForm } from "./invite-form";
import type { UserRole } from "@/lib/types";

export const metadata: Metadata = { title: "Join your team" };

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("team_members")
    .select("email, role, status, expires_at, organization:organizations(name)")
    .eq("token", token)
    .maybeSingle();

  const valid =
    invite && invite.status === "pending" && new Date(invite.expires_at) > new Date();

  if (!valid) {
    return (
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Invite not valid</CardTitle>
          <CardDescription>
            This invitation link is invalid, revoked, or has expired. Ask your admin to send a
            new one.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const orgName =
    (invite.organization as unknown as { name: string } | null)?.name ?? "the team";

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl">Join {orgName}</CardTitle>
        <CardDescription>
          You&apos;ve been invited as{" "}
          <span className="font-semibold text-foreground">
            {ROLE_LABELS[invite.role as UserRole]}
          </span>{" "}
          ({invite.email}). Set up your account to get started.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <InviteForm token={token} />
      </CardContent>
    </Card>
  );
}
