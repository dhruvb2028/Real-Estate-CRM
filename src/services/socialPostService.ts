import "server-only";
import { getResolvedConfig } from "@/services/config";
import type { ServiceResult, SocialPost } from "@/lib/types";

/**
 * Social publishing hand-off adapter.
 * The MVP doesn't publish directly to social networks; approved/scheduled
 * posts can be forwarded to a Zapier/Make/SocialPilot/Buffer webhook which
 * handles actual publishing. Dry-run logs the payload.
 *
 * TODO: add direct publishing adapters (Meta Graph API, LinkedIn API) behind
 * this same interface when API credentials are available.
 */
export const socialPostService = {
  async pushToWebhook(orgId: string, post: SocialPost): Promise<ServiceResult> {
    const config = await getResolvedConfig(orgId);

    const payload = {
      id: post.id,
      title: post.title,
      type: post.post_type,
      caption: post.caption,
      mediaUrls: post.media_urls,
      scheduledAt: post.scheduled_at,
      status: post.status,
    };

    if (config.forceDryRun || !config.socialWebhookUrl) {
      console.log("[DRY-RUN socialPostService] Would push to social webhook:", payload);
      return { ok: true, dryRun: true };
    }

    try {
      const res = await fetch(config.socialWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Webhook push failed" };
    }
  },
};
