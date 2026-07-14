"use client";

import { useActionState, useState, useTransition } from "react";
import { AlertCircle, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createSocialPost, generateCaption } from "@/server/actions/social";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/layout/submit-button";
import {
  SOCIAL_POST_STATUS_LABELS,
  SOCIAL_POST_TYPE_LABELS,
} from "@/lib/constants";

export function PostForm({ team }: { team: { id: string; full_name: string }[] }) {
  const [state, formAction] = useActionState(createSocialPost, {});
  const [title, setTitle] = useState("");
  const [postType, setPostType] = useState("instagram_post");
  const [caption, setCaption] = useState("");
  const [drafting, startDraft] = useTransition();

  function onGenerateCaption() {
    startDraft(async () => {
      const r = await generateCaption(title, postType);
      if (r.ok && r.caption) {
        setCaption(r.caption);
        toast.success(r.message);
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sp-title">Title *</Label>
            <Input
              id="sp-title"
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11"
              placeholder="New launch teaser — Emerald Heights"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sp-type">Post type</Label>
              <Select
                name="postType"
                value={postType}
                onValueChange={(v) => setPostType(v ?? "instagram_post")}
              >
                <SelectTrigger id="sp-type" className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SOCIAL_POST_TYPE_LABELS).map(([v, label]) => (
                    <SelectItem key={v} value={v}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp-status">Status</Label>
              <Select name="status" defaultValue="idea">
                <SelectTrigger id="sp-status" className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SOCIAL_POST_STATUS_LABELS).map(([v, label]) => (
                    <SelectItem key={v} value={v}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="sp-caption">Caption</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={drafting || !title.trim()}
                onClick={onGenerateCaption}
                className="h-7 gap-1 text-xs text-primary"
              >
                {drafting ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <Sparkles className="size-3.5" aria-hidden />
                )}
                AI draft
              </Button>
            </div>
            <Textarea
              id="sp-caption"
              name="caption"
              rows={4}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write the caption, or let AI draft it…"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sp-scheduled">Schedule for</Label>
              <Input
                id="sp-scheduled"
                name="scheduledAt"
                type="datetime-local"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp-assignee">Assign to</Label>
              <Select name="assignedTo">
                <SelectTrigger id="sp-assignee" className="h-11 w-full">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {team.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sp-notes">Notes</Label>
            <Textarea
              id="sp-notes"
              name="notes"
              rows={2}
              placeholder="Media links, hashtags to include, references…"
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

          <SubmitButton>Create post</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
