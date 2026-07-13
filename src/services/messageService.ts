import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResolvedConfig } from "@/services/config";
import type { MessageChannel, ServiceResult } from "@/lib/types";

export interface SendMessageInput {
  orgId: string;
  leadId: string;
  senderId?: string | null;
  channel: Extract<MessageChannel, "whatsapp" | "sms">;
  to: string; // E.164
  body: string;
  templateKey?: string;
}

/**
 * WhatsApp / SMS adapter (Twilio).
 * Production: Twilio Messages API. Dry-run: logs a `messages` row with
 * status "simulated" so timelines and reports behave identically.
 */
export const messageService = {
  async send(input: SendMessageInput): Promise<ServiceResult<{ messageId: string }>> {
    const admin = createAdminClient();
    const config = await getResolvedConfig(input.orgId);
    const live = config.twilio.enabled && (input.channel !== "whatsapp" || !!config.twilio.whatsappNumber);

    // Persist first so a provider failure is still visible in the timeline.
    const { data: row, error: insErr } = await admin
      .from("messages")
      .insert({
        organization_id: input.orgId,
        lead_id: input.leadId,
        sender_id: input.senderId ?? null,
        channel: input.channel,
        direction: "outbound",
        template_key: input.templateKey ?? null,
        body: input.body,
        status: live ? "queued" : "simulated",
        is_dry_run: !live,
      })
      .select("id")
      .single();
    if (insErr || !row) return { ok: false, error: insErr?.message ?? "insert failed" };

    if (!live) {
      console.log(
        `[DRY-RUN messageService] ${input.channel.toUpperCase()} → ${input.to}: ${input.body}`
      );
      return { ok: true, dryRun: true, data: { messageId: row.id } };
    }

    try {
      const twilio = (await import("twilio")).default;
      const client = twilio(config.twilio.accountSid!, config.twilio.authToken!);
      const from =
        input.channel === "whatsapp"
          ? config.twilio.whatsappNumber!.startsWith("whatsapp:")
            ? config.twilio.whatsappNumber!
            : `whatsapp:${config.twilio.whatsappNumber}`
          : config.twilio.phoneNumber!;
      const to = input.channel === "whatsapp" ? `whatsapp:${input.to}` : input.to;

      const msg = await client.messages.create({ from, to, body: input.body });

      await admin
        .from("messages")
        .update({ status: "sent", external_id: msg.sid })
        .eq("id", row.id);
      return { ok: true, data: { messageId: row.id } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Twilio send failed";
      await admin.from("messages").update({ status: "failed" }).eq("id", row.id);
      return { ok: false, error: message };
    }
  },
};
