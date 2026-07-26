import { NextRequest, NextResponse } from "next/server";
import { callService } from "@/services/callService";
import { assertTwilioRequest } from "@/app/api/twilio/verify";

export const dynamic = "force-dynamic";

/**
 * Twilio Voice TwiML webhook.
 * POST /api/twilio/voice?step=agent-answer|agent-confirm|lead-join&callId=...
 *
 * Every request is signature-verified against the org's Twilio auth token before
 * any TwiML is produced.
 */
async function handle(request: NextRequest) {
  const step = request.nextUrl.searchParams.get("step") ?? "";
  const callId = request.nextUrl.searchParams.get("callId") ?? "";

  if (!step || !callId) {
    return new NextResponse("<Response><Hangup/></Response>", {
      status: 400,
      headers: { "Content-Type": "text/xml" },
    });
  }

  const verified = await assertTwilioRequest(request, callId);
  if (!verified.ok) return verified.response;

  const twiml = await callService.getTwiML(step, callId);
  return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
}

export const GET = handle;
export const POST = handle;
