"use client";

import { useState, useTransition } from "react";
import { useActionState, useEffect } from "react";
import {
  CalendarPlus,
  Loader2,
  Mail,
  MessageCircle,
  PhoneCall,
  PhoneForwarded,
  Send,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import {
  sendLeadMessage,
  sharePropertyWithLead,
  triggerBridgeCall,
} from "@/server/actions/leads";
import { scheduleFollowup } from "@/server/actions/followups";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/layout/submit-button";
import {
  FOLLOWUP_TEMPLATES,
  FOLLOWUP_TYPE_LABELS,
  formatPrice,
  renderTemplate,
} from "@/lib/constants";
import type { ActionState, Lead, Property } from "@/lib/types";

interface QuickActionsProps {
  lead: Lead;
  properties: Pick<Property, "id" | "title" | "location" | "price">[];
}

/** Sticky one-tap action bar on the lead detail page. */
export function QuickActions({ lead, properties }: QuickActionsProps) {
  const [calling, startCall] = useTransition();

  function onBridgeCall() {
    startCall(async () => {
      const result = await triggerBridgeCall(lead.id);
      if (result.ok) toast.success(result.message);
      else toast.error(result.error);
    });
  }

  return (
    <div className="fixed inset-x-0 bottom-14 z-40 border-t border-border bg-card/95 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-card/85 md:sticky md:bottom-auto md:top-16 md:z-30 md:rounded-xl md:border md:bg-card md:shadow-sm pb-safe md:pb-2.5">
      <div className="mx-auto grid max-w-2xl grid-cols-4 gap-2">
        <Button
          onClick={onBridgeCall}
          disabled={calling}
          className="h-12 flex-col gap-0.5 text-[11px] font-semibold"
          aria-label="Start bridge call"
        >
          {calling ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : (
            <PhoneForwarded className="size-5" aria-hidden />
          )}
          Bridge Call
        </Button>

        <MessageDrawer lead={lead} />
        <ShareDrawer lead={lead} properties={properties} />
        <FollowupDrawer lead={lead} />
      </div>
    </div>
  );
}

function useActionToast(state: ActionState, onSuccess?: () => void) {
  useEffect(() => {
    if (state.ok && state.message) {
      toast.success(state.message);
      onSuccess?.();
    } else if (state.ok === false && state.error) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}

// ---------- One-click message ----------
function MessageDrawer({ lead }: { lead: Lead }) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<"whatsapp" | "sms" | "email">("whatsapp");
  const [templateKey, setTemplateKey] = useState(FOLLOWUP_TEMPLATES[0].key);
  const [state, formAction] = useActionState(sendLeadMessage, {});
  useActionToast(state, () => setOpen(false));

  const preview = renderTemplate(
    FOLLOWUP_TEMPLATES.find((t) => t.key === templateKey)?.body ?? "",
    {
      leadName: lead.full_name.split(" ")[0],
      preferredLocation: lead.preferred_location ?? "your preferred area",
    }
  );

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger
        render={
          <Button
            variant="secondary"
            className="h-12 flex-col gap-0.5 text-[11px] font-semibold"
            aria-label="Send follow-up message"
          />
        }
      >
        <MessageCircle className="size-5" aria-hidden />
        Message
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-lg px-4 pb-6">
          <DrawerHeader className="px-0">
            <DrawerTitle>One-click follow-up</DrawerTitle>
            <DrawerDescription>
              Send {lead.full_name.split(" ")[0]} a quick message
            </DrawerDescription>
          </DrawerHeader>

          <form action={formAction} className="space-y-4">
            <input type="hidden" name="leadId" value={lead.id} />
            <input type="hidden" name="channel" value={channel} />
            <input type="hidden" name="templateKey" value={templateKey} />

            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Channel">
              {(
                [
                  { v: "whatsapp", label: "WhatsApp", icon: MessageCircle },
                  { v: "sms", label: "SMS", icon: Send },
                  { v: "email", label: "Email", icon: Mail },
                ] as const
              ).map(({ v, label, icon: Icon }) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={channel === v}
                  onClick={() => setChannel(v)}
                  disabled={v === "email" && !lead.email}
                  className={`flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    channel === v
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="msg-template">Template</Label>
              <Select
                value={templateKey}
                onValueChange={(v) => setTemplateKey(v ?? FOLLOWUP_TEMPLATES[0].key)}
              >
                <SelectTrigger id="msg-template" className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOLLOWUP_TEMPLATES.map((t) => (
                    <SelectItem key={t.key} value={t.key}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="msg-body">Message (edit to customize)</Label>
              <Textarea id="msg-body" name="body" rows={3} defaultValue={preview} key={preview} />
            </div>

            <SubmitButton>
              <Send className="size-4" aria-hidden /> Send{" "}
              {channel === "whatsapp" ? "WhatsApp" : channel.toUpperCase()}
            </SubmitButton>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// ---------- One-click property share ----------
function ShareDrawer({ lead, properties }: QuickActionsProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(sharePropertyWithLead, {});
  useActionToast(state, () => setOpen(false));

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger
        render={
          <Button
            variant="secondary"
            className="h-12 flex-col gap-0.5 text-[11px] font-semibold"
            aria-label="Share property"
          />
        }
      >
        <Share2 className="size-5" aria-hidden />
        Property
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-lg px-4 pb-6">
          <DrawerHeader className="px-0">
            <DrawerTitle>Send property details</DrawerTitle>
            <DrawerDescription>
              Photos + details + share link go out in one click
            </DrawerDescription>
          </DrawerHeader>

          {properties.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No available properties yet. Add inventory first.
            </p>
          ) : (
            <form action={formAction} className="space-y-4">
              <input type="hidden" name="leadId" value={lead.id} />

              <div className="space-y-1.5">
                <Label htmlFor="share-property">Property</Label>
                <Select name="propertyId" defaultValue={properties[0].id}>
                  <SelectTrigger id="share-property" className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title} · {formatPrice(p.price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="share-channel">Send via</Label>
                <Select name="channel" defaultValue="whatsapp">
                  <SelectTrigger id="share-channel" className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="email" disabled={!lead.email}>
                      Email{!lead.email ? " (no address)" : ""}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <SubmitButton>
                <Share2 className="size-4" aria-hidden /> Send property
              </SubmitButton>
            </form>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// ---------- Schedule follow-up ----------
function FollowupDrawer({ lead }: { lead: Lead }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(scheduleFollowup, {});
  useActionToast(state, () => setOpen(false));

  const defaultDue = new Date(Date.now() + 24 * 3600 * 1000);
  defaultDue.setMinutes(0, 0, 0);
  const defaultValue = new Date(
    defaultDue.getTime() - defaultDue.getTimezoneOffset() * 60000
  )
    .toISOString()
    .slice(0, 16);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger
        render={
          <Button
            variant="secondary"
            className="h-12 flex-col gap-0.5 text-[11px] font-semibold"
            aria-label="Schedule follow-up"
          />
        }
      >
        <CalendarPlus className="size-5" aria-hidden />
        Follow-up
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-lg px-4 pb-6">
          <DrawerHeader className="px-0">
            <DrawerTitle>Schedule follow-up</DrawerTitle>
            <DrawerDescription>You&apos;ll get a reminder when it&apos;s due</DrawerDescription>
          </DrawerHeader>

          <form action={formAction} className="space-y-4">
            <input type="hidden" name="leadId" value={lead.id} />

            <div className="space-y-1.5">
              <Label htmlFor="fu-type">Type</Label>
              <Select name="type" defaultValue="call">
                <SelectTrigger id="fu-type" className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FOLLOWUP_TYPE_LABELS).map(([v, label]) => (
                    <SelectItem key={v} value={v}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fu-due">When</Label>
              <Input
                id="fu-due"
                name="dueAt"
                type="datetime-local"
                required
                defaultValue={defaultValue}
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fu-notes">Notes</Label>
              <Textarea id="fu-notes" name="notes" rows={2} placeholder="What to discuss…" />
            </div>

            <SubmitButton>
              <PhoneCall className="size-4" aria-hidden /> Schedule
            </SubmitButton>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
