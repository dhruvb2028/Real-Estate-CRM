"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { revokeInvite } from "@/server/actions/team";
import { Button } from "@/components/ui/button";

export function RevokeInviteButton({
  inviteId,
  email,
}: {
  inviteId: string;
  email: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={pending}
      className="size-11 text-muted-foreground hover:text-destructive md:size-8"
      aria-label={`Revoke invite for ${email}`}
      onClick={() =>
        startTransition(async () => {
          const r = await revokeInvite(inviteId);
          if (r.ok) toast.success(r.message);
          else toast.error(r.error);
        })
      }
    >
      <X className="size-4" aria-hidden />
    </Button>
  );
}
