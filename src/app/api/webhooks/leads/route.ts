import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { leadAssignmentService } from "@/services/leadAssignmentService";
import { callService } from "@/services/callService";
import {
  normalizePropertyType,
  normalizeSource,
  webhookLeadSchema,
} from "@/lib/validations";

export const dynamic = "force-dynamic";

/** Generous enough for real portal bursts, tight enough to blunt abuse. */
const RATE_LIMIT_PER_MINUTE = Number(process.env.LEAD_WEBHOOK_RATE_LIMIT ?? 60);

/** Constant-time compare so the secret can't be discovered by timing. */
function secretsMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * POST /api/webhooks/leads
 *
 * Lead intake from external platforms (36 Acre, MagicBricks, website forms,
 * Zapier, Make, Facebook Lead Ads...).
 *
 * Auth: `x-webhook-secret` header must match the org's lead_webhook_secret
 * (or LEAD_WEBHOOK_SECRET env). Optionally pass `x-organization-id` when
 * multiple orgs share a deployment; otherwise the secret identifies the org.
 *
 * On success: saves lead → round-robin assigns an agent → triggers the
 * instant bridge call → logs activity → notifies the agent. Returns 201.
 */
export async function POST(request: NextRequest) {
  // Throttle by source IP so a discovered endpoint can't be used to flood the
  // CRM with junk leads (each of which would also trigger a billable call).
  const limit = rateLimit(`leads:${clientIp(request)}`, {
    limit: RATE_LIMIT_PER_MINUTE,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(limit.retryAfterSeconds),
          "X-RateLimit-Limit": String(RATE_LIMIT_PER_MINUTE),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = webhookLeadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const secret = request.headers.get("x-webhook-secret");
  if (!secret) {
    return NextResponse.json({ error: "Missing x-webhook-secret header" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Resolve the organization: explicit header, then secret lookup, then env fallback.
  let orgId = request.headers.get("x-organization-id");
  const { data: settingsRow } = await admin
    .from("integration_settings")
    .select("organization_id, lead_webhook_secret")
    .eq("lead_webhook_secret", secret)
    .maybeSingle();

  if (settingsRow) {
    if (orgId && orgId !== settingsRow.organization_id) {
      return NextResponse.json({ error: "Secret does not match organization" }, { status: 401 });
    }
    orgId = settingsRow.organization_id;
  } else if (
    process.env.LEAD_WEBHOOK_SECRET &&
    secretsMatch(secret, process.env.LEAD_WEBHOOK_SECRET)
  ) {
    // Env-level secret (single-tenant/local dev): use header org or the only org.
    if (!orgId) {
      const { data: orgs } = await admin.from("organizations").select("id").limit(2);
      if (orgs?.length === 1) orgId = orgs[0].id;
    }
    if (!orgId) {
      return NextResponse.json(
        { error: "x-organization-id header required with env-level secret" },
        { status: 400 }
      );
    }
  } else {
    return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
  }

  if (!orgId) {
    return NextResponse.json({ error: "Organization could not be resolved" }, { status: 400 });
  }
  const resolvedOrgId = orgId;

  const d = parsed.data;
  const fullName = (d.fullName ?? d.full_name ?? d.name)!;
  const phone = (d.phone ?? d.phoneNumber ?? d.mobile)!;
  const source = normalizeSource(d.source);

  const { data: lead, error: insertErr } = await admin
    .from("leads")
    .insert({
      organization_id: resolvedOrgId,
      full_name: fullName,
      phone,
      email: d.email || null,
      source,
      source_detail: d.source ?? null,
      property_type: normalizePropertyType(d.propertyType ?? d.property_type),
      budget_min: d.budgetMin ?? d.budget_min ?? null,
      budget_max: d.budgetMax ?? d.budget_max ?? null,
      preferred_location: d.preferredLocation ?? d.preferred_location ?? null,
      notes: d.notes ?? null,
      status: "new",
      temperature: "warm",
    })
    .select("id")
    .single();

  if (insertErr || !lead) {
    return NextResponse.json(
      { error: insertErr?.message ?? "Failed to save lead" },
      { status: 500 }
    );
  }

  await admin.from("activities").insert({
    organization_id: resolvedOrgId,
    lead_id: lead.id,
    type: "lead_created",
    title: "Lead received",
    description: `${fullName} via ${d.source ?? source} (webhook)`,
    metadata: { webhook: true, raw_source: d.source ?? null },
  });

  const assignment = await leadAssignmentService.assign(resolvedOrgId, lead.id);

  // Bridge call runs after the response is sent — external platforms get a
  // fast ACK and the call automation continues server-side.
  after(async () => {
    try {
      await callService.initiateBridge(resolvedOrgId, lead.id);
    } catch (e) {
      console.error("[webhook/leads] bridge call failed:", e);
    }
  });

  return NextResponse.json(
    {
      ok: true,
      leadId: lead.id,
      assignedAgentId: assignment.data?.agentId ?? null,
      bridgeCall: "queued",
    },
    { status: 201 }
  );
}
