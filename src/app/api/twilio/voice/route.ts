import { NextRequest, NextResponse } from "next/server";
import { callService } from "@/services/callService";

export const dynamic = "force-dynamic";

/**
 * Twilio Voice TwiML webhook.
 * GET/POST /api/twilio/voice?step=agent-answer|agent-confirm|lead-join&callId=...
 * Returns the TwiML for each step of the agent→lead bridge.
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

  const twiml = await callService.getTwiML(step, callId);
  return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
}

export const GET = handle;
export const POST = handle;
