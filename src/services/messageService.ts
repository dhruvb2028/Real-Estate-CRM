import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResolvedConfig } from "@/services/config";
import { waPhone } from "@/lib/constants";
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

export interface SendMessageData {
  messageId: string;
  /**
   * Present when WhatsApp is in deep-link mode: the client should open this URL
   * so the agent's own WhatsApp composes the message.
   */
  deepLink?: string;
}

/**
 * WhatsApp / SMS adapter.
 *
 * WhatsApp has two delivery modes:
 *  - deep_link (default): returns a wa.me URL the agent's device opens. Works
 *    immediately with no Meta business verification, costs nothing, and the
 *    lead sees a message from the agent's real number.
 *  - api: sends automatically through Twilio. Requires a verified WhatsApp
 *    sender; the client switches to this in Settings once approved.
 *
 * SMS always goes through Twilio. Both fall back to a logged simulation in
 * dry-run mode so the whole flow is demonstrable without credentials.
 */
export const messageService = {
  async send(input: SendMessageInput): Promise<ServiceResult<SendMessageData>> {
    const admin = createAdminClient();
    const config = await getResolvedConfig(input.orgId);

    const useDeepLink =
      input.channel === "whatsapp" && config.whatsappMode === "deep_link";

    const live =
      !useDeepLink &&
      config.twilio.enabled &&
      (input.channel !== "whatsapp" || !!config.twilio.whatsappNumber);

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
        // Deep-link messages are genuinely handed to the agent's WhatsApp, so
        // they're recorded as sent rather than simulated.
        status: useDeepLink ? "sent" : live ? "queued" : "simulated",
        is_dry_run: !live && !useDeepLink,
      })
      .select("id")
      .single();
    if (insErr || !row) return { ok: false, error: insErr?.message ?? "insert failed" };

    if (useDeepLink) {
      const deepLink = `https://wa.me/${waPhone(input.to)}?text=${encodeURIComponent(input.body)}`;
      return { ok: true, data: { messageId: row.id, deepLink } };
    }

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
