"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { format, isPast, isToday } from "date-fns";
import { Check, ClipboardList, Loader2, MapPin, Phone, User } from "lucide-react";
import { toast } from "sonner";
import { updateTaskStatus } from "@/server/actions/tasks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { TaskWithRelations } from "@/server/queries/tasks";
import { cn } from "@/lib/utils";

const TYPE_META: Record<string, { label: string; icon: typeof MapPin }> = {
  site_visit: { label: "Site Visit", icon: MapPin },
  call: { label: "Call", icon: Phone },
  followup: { label: "Follow-up", icon: ClipboardList },
  general: { label: "Task", icon: ClipboardList },
};

export function TaskCard({ task }: { task: TaskWithRelations }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const meta = TYPE_META[task.task_type] ?? TYPE_META.general;
  const Icon = meta.icon;
  const overdue =
    task.due_at && task.status !== "completed" && isPast(new Date(task.due_at));

  function complete() {
    startTransition(async () => {
      const r = await updateTaskStatus(task.id, "completed", notes);
      if (r.ok) {
        toast.success(r.message);
        setOpen(false);
      } else toast.error(r.error);
    });
  }

  return (
    <Card className={cn("gap-0 p-4", overdue && "border-destructive/40")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className={cn("font-semibold", task.status === "completed" && "text-muted-foreground line-through")}>
              {task.title}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span>{meta.label}</span>
              {task.lead && (
                <Link href={`/leads/${task.lead.id}`} className="flex items-center gap-0.5 text-primary hover:underline">
                  <User className="size-3" aria-hidden />
                  {task.lead.full_name}
                </Link>
              )}
              {task.assignee && <span>→ {task.assignee.full_name}</span>}
            </p>
            {task.description && (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
            )}
            {task.visit_notes && (
              <p className="mt-1.5 rounded-md bg-muted px-2 py-1.5 text-xs text-muted-foreground">
                <span className="font-semibold">Visit notes:</span> {task.visit_notes}
              </p>
            )}
          </div>
        </div>
        {task.due_at && task.status !== "completed" && (
          <Badge variant={overdue ? "destructive" : "secondary"} className="shrink-0">
            {isToday(new Date(task.due_at))
              ? `Today, ${format(new Date(task.due_at), "h:mm a")}`
              : format(new Date(task.due_at), "d MMM, h:mm a")}
          </Badge>
        )}
        {task.status === "completed" && (
          <Badge variant="secondary" className="shrink-0">
            Done
          </Badge>
        )}
      </div>

      {task.status !== "completed" && (
        <div className="mt-3">
          <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger render={<Button size="sm" className="h-9 w-full" />}>
              <Check className="size-4" aria-hidden /> Mark complete
            </DrawerTrigger>
            <DrawerContent>
              <div className="mx-auto w-full max-w-lg px-4 pb-6">
                <DrawerHeader className="px-0">
                  <DrawerTitle>Complete task</DrawerTitle>
                  <DrawerDescription>{task.title}</DrawerDescription>
                </DrawerHeader>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor={`vn-${task.id}`}>
                      {task.task_type === "site_visit" ? "Visit notes" : "Completion notes"}{" "}
                      (optional)
                    </Label>
                    <Textarea
                      id={`vn-${task.id}`}
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={
                        task.task_type === "site_visit"
                          ? "Client liked the layout, concerned about price…"
                          : "How did it go?"
                      }
                    />
                  </div>
                  <Button onClick={complete} disabled={pending} className="h-11 w-full">
                    {pending ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Check className="size-4" aria-hidden />
                    )}
                    Complete task
                  </Button>
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      )}
    </Card>
  );
}
