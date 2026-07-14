"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Copy, Send, Share2 } from "lucide-react";
import { toast } from "sonner";
import { sharePropertyWithLead } from "@/server/actions/leads";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/layout/submit-button";

interface ShareWithLeadProps {
  propertyId: string;
  shareUrl: string;
  leads: { id: string; full_name: string; phone: string; email: string | null }[];
}

export function ShareWithLead({ propertyId, shareUrl, leads }: ShareWithLeadProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [state, formAction] = useActionState(sharePropertyWithLead, {});

  useEffect(() => {
    if (state.ok && state.message) {
      toast.success(state.message);
      setOpen(false);
    } else if (state.ok === false && state.error) {
      toast.error(state.error);
    }
  }, [state]);

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Share link copied");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" className="h-11 flex-1" onClick={copyLink}>
        {copied ? (
          <Check className="size-4 text-primary" aria-hidden />
        ) : (
          <Copy className="size-4" aria-hidden />
        )}
        Copy link
      </Button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger render={<Button className="h-11 flex-1" />}>
          <Share2 className="size-4" aria-hidden /> Send to lead
        </DrawerTrigger>
        <DrawerContent>
          <div className="mx-auto w-full max-w-lg px-4 pb-6">
            <DrawerHeader className="px-0">
              <DrawerTitle>Send property to a lead</DrawerTitle>
              <DrawerDescription>
                Photos, details and the share link go out in one click
              </DrawerDescription>
            </DrawerHeader>

            {leads.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No open leads yet.
              </p>
            ) : (
              <form action={formAction} className="space-y-4">
                <input type="hidden" name="propertyId" value={propertyId} />

                <div className="space-y-1.5">
                  <Label htmlFor="share-lead">Lead</Label>
                  <Select name="leadId" defaultValue={leads[0].id}>
                    <SelectTrigger id="share-lead" className="h-11 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {leads.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.full_name} · {l.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="share-channel2">Send via</Label>
                  <Select name="channel" defaultValue="whatsapp">
                    <SelectTrigger id="share-channel2" className="h-11 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <SubmitButton>
                  <Send className="size-4" aria-hidden /> Send property
                </SubmitButton>
              </form>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
