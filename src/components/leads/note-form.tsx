"use client";

import { useActionState, useEffect, useRef } from "react";
import { StickyNote } from "lucide-react";
import { toast } from "sonner";
import { addLeadNote } from "@/server/actions/leads";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/layout/submit-button";

export function NoteForm({ leadId }: { leadId: string }) {
  const [state, formAction] = useActionState(addLeadNote, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && state.message) {
      toast.success(state.message);
      formRef.current?.reset();
    } else if (state.ok === false && state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <input type="hidden" name="leadId" value={leadId} />
      <Textarea
        name="note"
        rows={2}
        required
        placeholder="Add a note about this lead…"
        aria-label="New note"
      />
      <SubmitButton className="h-11 w-auto px-4 text-sm md:h-10">
        <StickyNote className="size-4" aria-hidden /> Add note
      </SubmitButton>
    </form>
  );
}
