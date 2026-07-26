"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { toggleMemberActive, updateMemberRole } from "@/server/actions/team";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLE_LABELS, initials } from "@/lib/constants";
import type { Profile, UserRole } from "@/lib/types";

export function MemberRow({
  member,
  isSelf,
  canManage,
}: {
  member: Profile;
  isSelf: boolean;
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="flex items-center gap-3 py-3">
      <Avatar className="size-11 md:size-10">
        <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
          {initials(member.full_name || member.email)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate text-sm font-semibold">
          {member.full_name || member.email}
          {isSelf && (
            <Badge variant="outline" className="text-[10px]">
              You
            </Badge>
          )}
          {!member.is_active && (
            <Badge variant="secondary" className="text-[10px]">
              Inactive
            </Badge>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {member.email}
          {member.phone ? ` · ${member.phone}` : ""}
        </p>
      </div>

      {canManage && !isSelf ? (
        <div className="flex shrink-0 items-center gap-2">
          <Select
            value={member.role}
            disabled={pending}
            onValueChange={(v) =>
              startTransition(async () => {
                if (!v) return;
                const r = await updateMemberRole(member.id, v as UserRole);
                if (r.ok) toast.success(r.message);
                else toast.error(r.error);
              })
            }
          >
            <SelectTrigger
              className="h-11 w-auto text-xs md:h-9"
              aria-label={`Role for ${member.full_name}`}
            >
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
          <Switch
            checked={member.is_active}
            disabled={pending}
            aria-label={`${member.is_active ? "Deactivate" : "Activate"} ${member.full_name}`}
            onCheckedChange={(checked) =>
              startTransition(async () => {
                const r = await toggleMemberActive(member.id, checked);
                if (r.ok) toast.success(r.message);
                else toast.error(r.error);
              })
            }
          />
        </div>
      ) : (
        <Badge variant="secondary" className="shrink-0">
          {ROLE_LABELS[member.role]}
        </Badge>
      )}
    </li>
  );
}
