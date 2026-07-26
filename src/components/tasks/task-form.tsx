"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createTask } from "@/server/actions/tasks";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/layout/submit-button";
import { ROLE_LABELS } from "@/lib/constants";
import type { UserRole } from "@/lib/types";

interface TaskFormProps {
  members: { id: string; full_name: string; role: UserRole }[];
  leads: { id: string; full_name: string }[];
}

export function TaskFormDrawer({ members, leads }: TaskFormProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createTask, {});

  useEffect(() => {
    if (state.ok && state.message) {
      toast.success(state.message);
      setOpen(false);
    } else if (state.ok === false && state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger render={<Button className="h-11 md:h-10" />}>
        <Plus className="size-4" aria-hidden /> New task
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-lg px-4 pb-6">
          <DrawerHeader className="px-0">
            <DrawerTitle>New task</DrawerTitle>
            <DrawerDescription>
              Site visits, calls and to-dos for your team
            </DrawerDescription>
          </DrawerHeader>

          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="task-title">Title *</Label>
              <Input
                id="task-title"
                name="title"
                required
                className="h-11"
                placeholder="Site visit — Emerald Heights with Rahul"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="task-type">Type</Label>
                <Select name="taskType" defaultValue="site_visit">
                  <SelectTrigger id="task-type" className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="site_visit">Site Visit</SelectItem>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="followup">Follow-up</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="task-due">Due</Label>
                <Input id="task-due" name="dueAt" type="datetime-local" className="h-11" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="task-lead">Lead</Label>
                <Select name="leadId">
                  <SelectTrigger id="task-lead" className="h-11 w-full">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="task-assignee">Assign to</Label>
                <Select name="assignedTo">
                  <SelectTrigger id="task-assignee" className="h-11 w-full">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.full_name} · {ROLE_LABELS[m.role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="task-desc">Details</Label>
              <Textarea id="task-desc" name="description" rows={2} placeholder="Anything the assignee should know…" />
            </div>

            <SubmitButton>Create task</SubmitButton>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
