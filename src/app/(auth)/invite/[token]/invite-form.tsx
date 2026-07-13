"use client";

import { useActionState } from "react";
import { acceptInvite } from "@/server/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/layout/submit-button";
import { AlertCircle } from "lucide-react";

export function InviteForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(acceptInvite, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-1.5">
        <Label htmlFor="fullName">Your full name</Label>
        <Input id="fullName" name="fullName" required className="h-11" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          placeholder="+91 98100 00000"
          required
          className="h-11"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          required
          minLength={8}
          className="h-11"
        />
      </div>

      {state.error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">{state.message}</p>
      )}

      <SubmitButton>Join team</SubmitButton>
    </form>
  );
}
