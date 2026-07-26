import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResolvedConfig } from "@/services/config";
import {
  isValidTwilioSignature,
  publicRequestUrl,
} from "@/lib/security/twilio-signature";

type VerifyResult =
  | { ok: true; params: Record<string, string> }
  | { ok: false; response: NextResponse };

/**
 * Verifies that a /api/twilio/* request genuinely came from Twilio.
 *
 * Looks up the call's organization to get that deployment's auth token, then
 * checks X-Twilio-Signature. Requests are rejected unless they verify.
 *
 * Dry-run deployments (no live Twilio credentials) never receive real Twilio
 * traffic, so when the org has no auth token configured we reject rather than
 * fall open.
 */
export async function assertTwilioRequest(
  request: NextRequest,
  callId: string
): Promise<VerifyResult> {
  const forbidden = () =>
    new NextResponse("<Response><Hangup/></Response>", {
      status: 403,
      headers: { "Content-Type": "text/xml" },
    });

  // Collect POST params (Twilio signs these); GET requests sign the URL alone.
  const params: Record<string, string> = {};
  if (request.method === "POST") {
    const form = await request.clone().formData().catch(() => null);
    if (form) {
      for (const [k, v] of form.entries()) {
        if (typeof v === "string") params[k] = v;
      }
    }
  }

  const admin = createAdminClient();
  const { data: call } = await admin
    .from("calls")
    .select("organization_id")
    .eq("id", callId)
    .maybeSingle();

  if (!call) {
    console.warn("[twilio/verify] unknown callId", callId);
    return { ok: false, response: forbidden() };
  }

  const config = await getResolvedConfig(call.organization_id);
  const authToken = config.twilio.authToken;

  if (!authToken) {
    console.error(
      "[twilio/verify] no Twilio auth token configured — rejecting inbound webhook"
    );
    return { ok: false, response: forbidden() };
  }

  const valid = isValidTwilioSignature({
    authToken,
    signature: request.headers.get("x-twilio-signature"),
    url: publicRequestUrl(request, config.appUrl),
    params,
  });

  if (!valid) {
    console.error("[twilio/verify] invalid signature for call", callId);
    return { ok: false, response: forbidden() };
  }

  return { ok: true, params };
}
