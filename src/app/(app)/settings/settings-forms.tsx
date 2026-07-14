"use client";

import { useActionState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { updateOrganization, updateProfile } from "@/server/actions/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/layout/submit-button";
import { ROLE_LABELS } from "@/lib/constants";
import type { ActionState, Organization, Profile } from "@/lib/types";

function useToastState(state: ActionState) {
  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
    else if (state.ok === false && state.error) toast.error(state.error);
  }, [state]);
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction] = useActionState(updateProfile, {});
  useToastState(state);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">My profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pf-name">Full name</Label>
            <Input
              id="pf-name"
              name="fullName"
              defaultValue={profile.full_name}
              required
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-phone">Phone</Label>
            <Input
              id="pf-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              defaultValue={profile.phone ?? ""}
              className="h-11"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {profile.email} · {ROLE_LABELS[profile.role]}
          </p>
          {state.error && (
            <p role="alert" className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" aria-hidden />
              {state.error}
            </p>
          )}
          <SubmitButton className="h-10 w-auto px-5 text-sm">Save profile</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}

export function OrganizationForm({ org }: { org: Organization }) {
  const [state, formAction] = useActionState(updateOrganization, {});
  useToastState(state);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Workspace</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="org-name">Business name</Label>
            <Input id="org-name" name="name" defaultValue={org.name} required className="h-11" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="org-phone">Business phone</Label>
              <Input
                id="org-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                defaultValue={org.phone ?? ""}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-email">Business email</Label>
              <Input
                id="org-email"
                name="email"
                type="email"
                defaultValue={org.email ?? ""}
                className="h-11"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-address">Address</Label>
            <Input id="org-address" name="address" defaultValue={org.address ?? ""} className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-start">Work start time (for late marking)</Label>
            <Input
              id="org-start"
              name="workStartTime"
              type="time"
              defaultValue={org.work_start_time?.slice(0, 5) ?? "09:30"}
              className="h-11 w-40"
            />
          </div>
          {state.error && (
            <p role="alert" className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" aria-hidden />
              {state.error}
            </p>
          )}
          <SubmitButton className="h-10 w-auto px-5 text-sm">Save workspace</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
