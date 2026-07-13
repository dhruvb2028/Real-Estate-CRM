import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResolvedConfig } from "@/services/config";
import { messageService } from "@/services/messageService";
import { emailService } from "@/services/emailService";
import {
  PROPERTY_SHARE_TEMPLATE,
  formatPrice,
  renderTemplate,
} from "@/lib/constants";
import type { Lead, MessageChannel, Property, ServiceResult } from "@/lib/types";

export interface SharePropertyInput {
  orgId: string;
  leadId: string;
  propertyId: string;
  sharedBy: string;
  channel: MessageChannel;
  customMessage?: string;
}

/**
 * One-click property sharing: builds the public share link, renders the
 * message template, sends it over the chosen channel (or dry-run), and logs
 * both the share row and a timeline activity.
 */
export const propertyShareService = {
  buildShareUrl(appUrl: string, shareToken: string): string {
    return `${appUrl.replace(/\/$/, "")}/p/${shareToken}`;
  },

  async share(input: SharePropertyInput): Promise<ServiceResult<{ shareUrl: string; body: string }>> {
    const admin = createAdminClient();
    const config = await getResolvedConfig(input.orgId);

    const [{ data: lead }, { data: property }] = await Promise.all([
      admin.from("leads").select("*").eq("id", input.leadId).eq("organization_id", input.orgId).single(),
      admin.from("properties").select("*").eq("id", input.propertyId).eq("organization_id", input.orgId).single(),
    ]);
    if (!lead || !property) return { ok: false, error: "Lead or property not found" };

    const l = lead as Lead;
    const p = property as Property;
    const shareUrl = this.buildShareUrl(config.appUrl, p.share_token);

    const body =
      input.customMessage?.trim() ||
      renderTemplate(PROPERTY_SHARE_TEMPLATE.body, {
        leadName: l.full_name,
        propertyTitle: p.title,
        location: p.location,
        price: formatPrice(p.price),
        shareLink: shareUrl,
      });

    // Send over the chosen channel
    let sendResult: ServiceResult<unknown>;
    if (input.channel === "email") {
      if (!l.email) return { ok: false, error: "Lead has no email address" };
      sendResult = await emailService.send({
        orgId: input.orgId,
        leadId: l.id,
        senderId: input.sharedBy,
        to: l.email,
        subject: `${p.title} — property details`,
        body,
        templateKey: PROPERTY_SHARE_TEMPLATE.key,
      });
    } else {
      sendResult = await messageService.send({
        orgId: input.orgId,
        leadId: l.id,
        senderId: input.sharedBy,
        channel: input.channel,
        to: l.phone,
        body,
        templateKey: PROPERTY_SHARE_TEMPLATE.key,
      });
    }
    if (!sendResult.ok) return { ok: false, error: sendResult.error };

    await admin.from("lead_property_shares").insert({
      organization_id: input.orgId,
      lead_id: l.id,
      property_id: p.id,
      shared_by: input.sharedBy,
      channel: input.channel,
      message_body: body,
      share_url: shareUrl,
      status: sendResult.dryRun ? "simulated" : "sent",
    });

    await admin.from("activities").insert({
      organization_id: input.orgId,
      lead_id: l.id,
      actor_id: input.sharedBy,
      type: "property_shared",
      title: `Property shared via ${input.channel}`,
      description: `${p.title} — ${p.location}`,
      metadata: { property_id: p.id, share_url: shareUrl, dry_run: !!sendResult.dryRun },
    });

    await admin
      .from("leads")
      .update({ last_contacted_at: new Date().toISOString() })
      .eq("id", l.id);

    return { ok: true, dryRun: sendResult.dryRun, data: { shareUrl, body } };
  },
};
