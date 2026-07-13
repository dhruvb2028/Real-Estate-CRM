import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResolvedConfig } from "@/services/config";
import { notificationService } from "@/services/notificationService";
import { LEAD_SOURCE_LABELS } from "@/lib/constants";
import type { Call, Lead, LeadSource, Profile, ServiceResult } from "@/lib/types";

const MAX_AGENT_ATTEMPTS = 3;
const AGENT_RING_TIMEOUT_SECONDS = 25;

/**
 * Instant agent-to-lead call bridge.
 *
 * Production (Twilio):
 *   1. Call the assigned agent first.
 *   2. Agent answers → TwiML <Gather> plays "New lead from {source}. Press any
 *      key to connect with {leadName}."
 *   3. Agent presses a key → agent joins conference `lead-{callId}`, and we
 *      place the outbound call to the lead into the same conference.
 *   4. Status callbacks (/api/twilio/status) progress the `calls` row through
 *      ringing_agent → agent_connected → ringing_lead → bridged → completed.
 *   5. Agent no-answer → retry with the next available agent; when all fail,
 *      mark the lead "call_pending", create a follow-up task and notify
 *      sales managers.
 *
 * Dry-run: the same state machine is stepped through with short delays and
 * identical DB writes, so the UI/timeline/reports behave exactly the same.
 */
export const callService = {
  async initiateBridge(
    orgId: string,
    leadId: string,
    opts: { attempt?: number; excludedAgentIds?: string[] } = {}
  ): Promise<ServiceResult<{ callId: string | null }>> {
    const admin = createAdminClient();
    const attempt = opts.attempt ?? 1;
    const excluded = opts.excludedAgentIds ?? [];

    const { data: lead, error: leadErr } = await admin
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .eq("organization_id", orgId)
      .single();
    if (leadErr || !lead) return { ok: false, error: leadErr?.message ?? "Lead not found" };

    // Resolve the agent to ring on this attempt
    let agent: Pick<Profile, "id" | "full_name" | "phone"> | null = null;
    if (attempt === 1 && lead.assigned_agent_id && !excluded.includes(lead.assigned_agent_id)) {
      const { data } = await admin
        .from("profiles")
        .select("id, full_name, phone")
        .eq("id", lead.assigned_agent_id)
        .eq("is_active", true)
        .maybeSingle();
      agent = data;
    }
    if (!agent) {
      const { data: candidates } = await admin
        .from("profiles")
        .select("id, full_name, phone")
        .eq("organization_id", orgId)
        .eq("role", "sales_agent")
        .eq("is_active", true)
        .order("last_assigned_at", { ascending: true, nullsFirst: true });
      agent = candidates?.find((c) => !excluded.includes(c.id)) ?? null;
    }

    if (!agent) {
      await this.markCallPending(orgId, lead as Lead, null);
      return { ok: true, data: { callId: null } };
    }

    const config = await getResolvedConfig(orgId);
    const live = config.twilio.enabled;

    const { data: callRow, error: callErr } = await admin
      .from("calls")
      .insert({
        organization_id: orgId,
        lead_id: leadId,
        agent_id: agent.id,
        status: "queued",
        outcome: "pending",
        is_dry_run: !live,
        started_at: new Date().toISOString(),
        notes: attempt > 1 ? `Retry attempt ${attempt}` : null,
      })
      .select("id")
      .single();
    if (callErr || !callRow) return { ok: false, error: callErr?.message ?? "call insert failed" };
    const callId = callRow.id as string;

    if (!live) {
      await this.simulateBridge(orgId, callId, lead as Lead, agent, attempt, excluded);
      return { ok: true, dryRun: true, data: { callId } };
    }

    if (!agent.phone) {
      // Can't ring this agent — treat as no-answer and move on.
      await admin
        .from("calls")
        .update({ status: "agent_no_answer", outcome: "agent_no_answer", ended_at: new Date().toISOString() })
        .eq("id", callId);
      return this.retryOrEscalate(orgId, leadId, attempt, [...excluded, agent.id]);
    }

    try {
      const twilio = (await import("twilio")).default;
      const client = twilio(config.twilio.accountSid!, config.twilio.authToken!);
      const base = config.appUrl.replace(/\/$/, "");

      const call = await client.calls.create({
        to: agent.phone,
        from: config.twilio.phoneNumber!,
        url: `${base}/api/twilio/voice?step=agent-answer&callId=${callId}`,
        statusCallback: `${base}/api/twilio/status?callId=${callId}&leg=agent&attempt=${attempt}&excluded=${excluded.join(
          ","
        )}`,
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
        timeout: AGENT_RING_TIMEOUT_SECONDS,
      });

      await admin
        .from("calls")
        .update({ status: "ringing_agent", call_sid: call.sid })
        .eq("id", callId);

      return { ok: true, data: { callId } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Twilio call failed";
      await admin
        .from("calls")
        .update({ status: "failed", outcome: "failed", ended_at: new Date().toISOString(), notes: message })
        .eq("id", callId);
      return { ok: false, error: message };
    }
  },

  /** Called by /api/twilio/status when the agent leg ends without a bridge. */
  async retryOrEscalate(
    orgId: string,
    leadId: string,
    attempt: number,
    excludedAgentIds: string[]
  ): Promise<ServiceResult<{ callId: string | null }>> {
    if (attempt < MAX_AGENT_ATTEMPTS) {
      return this.initiateBridge(orgId, leadId, {
        attempt: attempt + 1,
        excludedAgentIds,
      });
    }
    const admin = createAdminClient();
    const { data: lead } = await admin
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();
    if (lead) await this.markCallPending(orgId, lead as Lead, excludedAgentIds);
    return { ok: true, data: { callId: null } };
  },

  /** All agents exhausted → lead becomes "call_pending" + follow-up + manager alert. */
  async markCallPending(
    orgId: string,
    lead: Lead,
    excludedAgentIds: string[] | null
  ): Promise<void> {
    const admin = createAdminClient();

    await admin
      .from("leads")
      .update({ status: "call_pending" })
      .eq("id", lead.id)
      .eq("organization_id", orgId);

    await admin.from("followups").insert({
      organization_id: orgId,
      lead_id: lead.id,
      agent_id: lead.assigned_agent_id,
      type: "call",
      notes: "Auto bridge call could not connect — call the lead back.",
      due_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      status: "pending",
    });

    await admin.from("activities").insert({
      organization_id: orgId,
      lead_id: lead.id,
      type: "call_made",
      title: "Bridge call unanswered",
      description: excludedAgentIds
        ? `No agent answered (${excludedAgentIds.length} tried). Lead marked Call Pending.`
        : "No available agent. Lead marked Call Pending.",
    });

    await notificationService.notifyRoles(orgId, ["admin", "sales_manager"], {
      type: "missed_lead_call",
      title: "Missed lead call",
      body: `${lead.full_name} could not be reached automatically — marked Call Pending.`,
      link: `/leads/${lead.id}`,
    });
  },

  /** Deterministic dry-run walk through the bridge state machine. */
  async simulateBridge(
    orgId: string,
    callId: string,
    lead: Lead,
    agent: Pick<Profile, "id" | "full_name" | "phone">,
    attempt: number,
    excluded: string[]
  ): Promise<void> {
    const admin = createAdminClient();
    const step = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const sid = `SIM${callId.slice(0, 8)}`;

    console.log(
      `[DRY-RUN callService] Bridging ${lead.full_name} (${lead.phone}) with agent ${agent.full_name} — attempt ${attempt}`
    );

    const update = (fields: Partial<Call>) =>
      admin.from("calls").update(fields).eq("id", callId);

    await update({ status: "ringing_agent", call_sid: sid });
    await step(400);

    // Simulate an unavailable agent when they have no phone on file.
    if (!agent.phone) {
      await update({
        status: "agent_no_answer",
        outcome: "agent_no_answer",
        ended_at: new Date().toISOString(),
      });
      await this.retryOrEscalate(orgId, lead.id, attempt, [...excluded, agent.id]);
      return;
    }

    await update({ status: "agent_connected" });
    await step(400);
    await update({ status: "ringing_lead", conference_sid: `SIMCONF${callId.slice(0, 8)}` });
    await step(400);
    await update({ status: "bridged" });
    await step(400);

    const duration = 47 + (parseInt(callId.slice(0, 4), 16) % 240); // 47s–~5min, stable per call
    await update({
      status: "completed",
      outcome: "connected",
      duration,
      ended_at: new Date().toISOString(),
    });

    await admin
      .from("leads")
      .update({
        status: lead.status === "new" ? "contacted" : lead.status,
        last_contacted_at: new Date().toISOString(),
      })
      .eq("id", lead.id);

    await admin.from("activities").insert({
      organization_id: orgId,
      lead_id: lead.id,
      actor_id: agent.id,
      type: "call_made",
      title: "Bridge call completed (simulated)",
      description: `${agent.full_name} spoke with ${lead.full_name} for ${duration}s`,
      metadata: { call_id: callId, dry_run: true },
    });
  },

  /** TwiML for each step of the live bridge (used by /api/twilio/voice). */
  async getTwiML(
    step: string,
    callId: string
  ): Promise<string> {
    const admin = createAdminClient();
    const { data: call } = await admin
      .from("calls")
      .select("*, lead:leads(*)")
      .eq("id", callId)
      .single();

    const VoiceResponse = (await import("twilio")).default.twiml.VoiceResponse;
    const twiml = new VoiceResponse();

    if (!call) {
      twiml.say("Sorry, this call is no longer valid.");
      twiml.hangup();
      return twiml.toString();
    }

    const lead = call.lead as Lead;
    const config = await getResolvedConfig(call.organization_id);
    const base = config.appUrl.replace(/\/$/, "");
    const conferenceName = `lead-${callId}`;

    switch (step) {
      case "agent-answer": {
        const sourceLabel = LEAD_SOURCE_LABELS[lead.source as LeadSource] ?? lead.source;
        const gather = twiml.gather({
          numDigits: 1,
          timeout: 10,
          action: `${base}/api/twilio/voice?step=agent-confirm&callId=${callId}`,
          method: "POST",
        });
        gather.say(
          { voice: "alice" },
          `New real estate lead from ${sourceLabel}. Press any key to connect with ${lead.full_name}.`
        );
        // No key pressed → treat as declined/no-answer
        twiml.say("No input received. Goodbye.");
        twiml.hangup();
        break;
      }

      case "agent-confirm": {
        await admin.from("calls").update({ status: "agent_connected" }).eq("id", callId);
        twiml.say({ voice: "alice" }, "Connecting you now. Please hold.");
        const dial = twiml.dial();
        dial.conference(
          {
            startConferenceOnEnter: true,
            endConferenceOnExit: true,
            statusCallback: `${base}/api/twilio/status?callId=${callId}&leg=conference`,
            statusCallbackEvent: ["start", "end", "join", "leave"],
            record: "record-from-start",
            recordingStatusCallback: `${base}/api/twilio/status?callId=${callId}&leg=recording`,
          },
          conferenceName
        );
        // Ring the lead into the same conference (fire and forget)
        void this.dialLeadIntoConference(call.organization_id, callId, lead);
        break;
      }

      case "lead-join": {
        await admin.from("calls").update({ status: "bridged" }).eq("id", callId);
        twiml.say({ voice: "alice" }, "Connecting you to your property consultant.");
        const dial2 = twiml.dial();
        dial2.conference({ startConferenceOnEnter: true }, conferenceName);
        break;
      }

      default:
        twiml.say("Invalid step.");
        twiml.hangup();
    }

    return twiml.toString();
  },

  async dialLeadIntoConference(orgId: string, callId: string, lead: Lead): Promise<void> {
    const admin = createAdminClient();
    const config = await getResolvedConfig(orgId);
    try {
      const twilio = (await import("twilio")).default;
      const client = twilio(config.twilio.accountSid!, config.twilio.authToken!);
      const base = config.appUrl.replace(/\/$/, "");
      const call = await client.calls.create({
        to: lead.phone,
        from: config.twilio.phoneNumber!,
        url: `${base}/api/twilio/voice?step=lead-join&callId=${callId}`,
        statusCallback: `${base}/api/twilio/status?callId=${callId}&leg=lead`,
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
        timeout: 30,
      });
      await admin
        .from("calls")
        .update({ status: "ringing_lead", notes: `lead_call_sid:${call.sid}` })
        .eq("id", callId);
    } catch (e) {
      await admin
        .from("calls")
        .update({
          status: "failed",
          outcome: "failed",
          ended_at: new Date().toISOString(),
          notes: e instanceof Error ? e.message : "Failed to dial lead",
        })
        .eq("id", callId);
    }
  },

  /** Status-callback reducer (from /api/twilio/status). */
  async handleStatusCallback(params: {
    callId: string;
    leg: string;
    twilioStatus?: string;
    callSid?: string;
    duration?: string;
    recordingUrl?: string;
    attempt?: number;
    excluded?: string[];
  }): Promise<void> {
    const admin = createAdminClient();
    const { data: call } = await admin
      .from("calls")
      .select("*, lead:leads(*)")
      .eq("id", params.callId)
      .single();
    if (!call) return;

    const lead = call.lead as Lead;

    if (params.leg === "recording" && params.recordingUrl) {
      await admin
        .from("calls")
        .update({ recording_url: params.recordingUrl })
        .eq("id", params.callId);
      return;
    }

    if (params.leg === "agent") {
      // Agent leg ended without ever reaching the conference → no answer/busy/failed
      if (
        ["no-answer", "busy", "failed", "canceled"].includes(params.twilioStatus ?? "") ||
        (params.twilioStatus === "completed" &&
          ["ringing_agent"].includes(call.status))
      ) {
        await admin
          .from("calls")
          .update({
            status: "agent_no_answer",
            outcome: "agent_no_answer",
            ended_at: new Date().toISOString(),
          })
          .eq("id", params.callId);
        await callService.retryOrEscalate(
          call.organization_id,
          call.lead_id,
          params.attempt ?? 1,
          [...(params.excluded ?? []), call.agent_id].filter(Boolean) as string[]
        );
      }
      return;
    }

    if (params.leg === "lead") {
      if (["no-answer", "busy", "failed"].includes(params.twilioStatus ?? "")) {
        await admin
          .from("calls")
          .update({
            status: "lead_no_answer",
            outcome: "lead_no_answer",
            ended_at: new Date().toISOString(),
          })
          .eq("id", params.callId);
        await admin.from("activities").insert({
          organization_id: call.organization_id,
          lead_id: call.lead_id,
          actor_id: call.agent_id,
          type: "call_made",
          title: "Lead did not answer",
          description: "Bridge call reached the agent but the lead did not pick up.",
          metadata: { call_id: params.callId },
        });
      }
      if (params.twilioStatus === "completed" && call.status === "bridged") {
        const duration = params.duration ? parseInt(params.duration, 10) : null;
        await admin
          .from("calls")
          .update({
            status: "completed",
            outcome: "connected",
            duration,
            ended_at: new Date().toISOString(),
          })
          .eq("id", params.callId);
        await admin
          .from("leads")
          .update({
            status: lead.status === "new" ? "contacted" : lead.status,
            last_contacted_at: new Date().toISOString(),
          })
          .eq("id", call.lead_id);
        await admin.from("activities").insert({
          organization_id: call.organization_id,
          lead_id: call.lead_id,
          actor_id: call.agent_id,
          type: "call_made",
          title: "Bridge call completed",
          description: duration ? `Call lasted ${duration}s` : "Call completed",
          metadata: { call_id: params.callId },
        });
      }
      return;
    }

    if (params.leg === "conference" && params.callSid) {
      await admin
        .from("calls")
        .update({ conference_sid: params.callSid })
        .eq("id", params.callId);
    }
  },
};
