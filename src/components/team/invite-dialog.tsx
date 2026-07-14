"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Copy, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { inviteTeamMember } from "@/server/actions/team";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/layout/submit-button";
import { ROLE_LABELS } from "@/lib/constants";

export function InviteDialog() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [state, formAction] = useActionState(inviteTeamMember, {});

  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
    else if (state.ok === false && state.error) toast.error(state.error);
  }, [state]);

  async function copyInvite() {
    if (!state.inviteUrl) return;
    await navigator.clipboard.writeText(state.inviteUrl);
    setCopied(true);
    toast.success("Invite link copied");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="h-10" />}>
        <UserPlus className="size-4" aria-hidden /> Invite
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a team member</DialogTitle>
          <DialogDescription>
            They&apos;ll get an email with a join link (also shown here to copy).
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              name="email"
              type="email"
              inputMode="email"
              required
              className="h-11"
              placeholder="teammate@company.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-role">Role</Label>
            <Select name="role" defaultValue="sales_agent">
              <SelectTrigger id="invite-role" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([v, label]) => (
                  <SelectItem key={v} value={v}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {state.inviteUrl && (
            <div className="space-y-1.5">
              <Label>Invite link</Label>
              <div className="flex gap-2">
                <Input readOnly value={state.inviteUrl} className="h-10 text-xs" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-10 shrink-0"
                  onClick={copyInvite}
                  aria-label="Copy invite link"
                >
                  {copied ? (
                    <Check className="size-4 text-primary" aria-hidden />
                  ) : (
                    <Copy className="size-4" aria-hidden />
                  )}
                </Button>
              </div>
            </div>
          )}

          <SubmitButton>Send invite</SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
