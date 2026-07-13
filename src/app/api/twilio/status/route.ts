import { NextRequest, NextResponse } from "next/server";
import { callService } from "@/services/callService";

export const dynamic = "force-dynamic";

/**
 * Twilio status callback webhook.
 * POST /api/twilio/status?callId=...&leg=agent|lead|conference|recording
 * Progresses the `calls` row and drives agent-retry / call-pending fallback.
 */
export async function POST(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const callId = params.get("callId");
  const leg = params.get("leg") ?? "agent";
  if (!callId) return NextResponse.json({ error: "callId required" }, { status: 400 });

  const form = await request.formData().catch(() => null);
  const get = (k: string) => (form?.get(k) as string | null) ?? undefined;

  await callService.handleStatusCallback({
    callId,
    leg,
    twilioStatus: get("CallStatus") ?? get("ConferenceStatus"),
    callSid: get("ConferenceSid") ?? get("CallSid"),
    duration: get("CallDuration"),
    recordingUrl: get("RecordingUrl"),
    attempt: params.get("attempt") ? parseInt(params.get("attempt")!, 10) : undefined,
    excluded: params.get("excluded")?.split(",").filter(Boolean),
  });

  return NextResponse.json({ ok: true });
}
