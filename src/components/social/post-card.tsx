"use client";

import { useTransition } from "react";
import { format, isToday, isTomorrow } from "date-fns";
import {
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clapperboard,
  CirclePlay,
  Image as ImageIcon,
  MoreVertical,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { deleteSocialPost, updateSocialPostStatus } from "@/server/actions/social";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SOCIAL_POST_STATUS_COLORS,
  SOCIAL_POST_STATUS_LABELS,
  SOCIAL_POST_TYPE_LABELS,
} from "@/lib/constants";
import type { SocialPost, SocialPostStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

function TypeIcon({ type }: { type: SocialPost["post_type"] }) {
  const cls = "size-4";
  switch (type) {
    case "instagram_reel":
      return <Clapperboard className={cls} aria-hidden />;
    case "instagram_post":
      return <ImageIcon className={cls} aria-hidden />;
    case "story":
      return <CirclePlay className={cls} aria-hidden />;
    case "facebook_post":
      return <ThumbsUp className={cls} aria-hidden />;
    case "linkedin_post":
      return <Briefcase className={cls} aria-hidden />;
  }
}

function scheduleLabel(post: SocialPost): string | null {
  if (!post.scheduled_at) return null;
  const d = new Date(post.scheduled_at);
  if (isToday(d)) return `Today, ${format(d, "h:mm a")}`;
  if (isTomorrow(d)) return `Tomorrow, ${format(d, "h:mm a")}`;
  return format(d, "EEE, d MMM · h:mm a");
}

const NEXT_STATUS: Partial<Record<SocialPostStatus, { to: SocialPostStatus; label: string }>> = {
  idea: { to: "draft", label: "Move to draft" },
  draft: { to: "scheduled", label: "Mark scheduled" },
  scheduled: { to: "published", label: "Mark published" },
};

export function PostCard({ post }: { post: SocialPost }) {
  const [pending, startTransition] = useTransition();
  const next = NEXT_STATUS[post.status];
  const when = scheduleLabel(post);

  return (
    <Card className="gap-0 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <TypeIcon type={post.post_type} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold">{post.title}</p>
            <p className="text-xs text-muted-foreground">
              {SOCIAL_POST_TYPE_LABELS[post.post_type]}
              {post.assignee ? ` · ${post.assignee.full_name}` : ""}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Badge className={cn("border-0", SOCIAL_POST_STATUS_COLORS[post.status])}>
            {SOCIAL_POST_STATUS_LABELS[post.status]}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={`Actions for ${post.title}`}
                />
              }
            >
              <MoreVertical className="size-4" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {next && (
                <DropdownMenuItem
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await updateSocialPostStatus(post.id, next.to);
                      if (r.ok) toast.success(r.message);
                      else toast.error(r.error);
                    })
                  }
                >
                  <CheckCircle2 className="size-4" aria-hidden />
                  {next.label}
                </DropdownMenuItem>
              )}
              {next && <DropdownMenuSeparator />}
              <DropdownMenuItem
                variant="destructive"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await deleteSocialPost(post.id);
                    if (r.ok) toast.success(r.message);
                    else toast.error(r.error);
                  })
                }
              >
                <Trash2 className="size-4" aria-hidden />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {post.caption && (
        <p className="mt-2.5 line-clamp-2 text-sm text-muted-foreground">{post.caption}</p>
      )}

      {when && (
        <p className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-primary">
          <CalendarDays className="size-3.5" aria-hidden />
          {when}
        </p>
      )}
    </Card>
  );
}
