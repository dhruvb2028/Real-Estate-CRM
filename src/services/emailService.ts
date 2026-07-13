import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResolvedConfig } from "@/services/config";
import type { ServiceResult } from "@/lib/types";

export interface SendEmailInput {
  orgId: string;
  leadId?: string;
  senderId?: string | null;
  to: string;
  subject: string;
  body: string; // plain text; wrapped in a minimal HTML template
  templateKey?: string;
}

/**
 * Email adapter (Resend). Dry-run logs a simulated `messages` row.
 * TODO: SMTP fallback adapter can be added behind the same interface.
 */
export const emailService = {
  async send(input: SendEmailInput): Promise<ServiceResult<{ messageId?: string }>> {
    const admin = createAdminClient();
    const config = await getResolvedConfig(input.orgId);
    const live = config.email.enabled;

    let rowId: string | undefined;
    if (input.leadId) {
      const { data: row } = await admin
        .from("messages")
        .insert({
          organization_id: input.orgId,
          lead_id: input.leadId,
          sender_id: input.senderId ?? null,
          channel: "email",
          direction: "outbound",
          template_key: input.templateKey ?? null,
          subject: input.subject,
          body: input.body,
          status: live ? "queued" : "simulated",
          is_dry_run: !live,
        })
        .select("id")
        .single();
      rowId = row?.id;
    }

    if (!live) {
      console.log(`[DRY-RUN emailService] → ${input.to} | ${input.subject}\n${input.body}`);
      return { ok: true, dryRun: true, data: { messageId: rowId } };
    }

    try {
      const { Resend } = await import("resend");
      const resend = new Resend(config.email.resendApiKey!);
      const html = `<div style="font-family:sans-serif;line-height:1.6;color:#134e4a;max-width:560px;margin:0 auto;padding:24px">
        ${input.body.replace(/\n/g, "<br/>")}
      </div>`;
      const { data, error } = await resend.emails.send({
        from: config.email.from,
        to: input.to,
        subject: input.subject,
        html,
        text: input.body,
      });
      if (error) throw new Error(error.message);

      if (rowId) {
        await admin
          .from("messages")
          .update({ status: "sent", external_id: data?.id ?? null })
          .eq("id", rowId);
      }
      return { ok: true, data: { messageId: rowId } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Email send failed";
      if (rowId) await admin.from("messages").update({ status: "failed" }).eq("id", rowId);
      return { ok: false, error: message };
    }
  },
};
