/**
 * End-to-end smoke test against a running deployment.
 *
 * Signs in as a real user, walks every route, and exercises the critical
 * business flows (lead intake webhook → auto-assignment → bridge call). Run this
 * against a client's deployment before handover, and after any upgrade.
 *
 *   npm run smoke                       # tests http://localhost:3000
 *   npm run smoke -- https://crm.client.com
 *
 * Credentials: SMOKE_EMAIL / SMOKE_PASSWORD, else CLIENT_ADMIN_* from .env.local
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const BASE = (
  process.argv.find((a) => a.startsWith("http")) ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const EMAIL = process.env.SMOKE_EMAIL || process.env.CLIENT_ADMIN_EMAIL!;
const PASSWORD = process.env.SMOKE_PASSWORD || process.env.CLIENT_ADMIN_PASSWORD!;
const WEBHOOK_SECRET = process.env.LEAD_WEBHOOK_SECRET!;

let passed = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  ✖ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title: string) {
  console.log(`\n${title}\n${"─".repeat(title.length)}`);
}

/** Builds the cookie @supabase/ssr expects, chunking exactly as it does. */
function sessionCookies(projectRef: string, session: object): string {
  const value = `base64-${Buffer.from(JSON.stringify(session)).toString("base64")}`;
  const name = `sb-${projectRef}-auth-token`;
  const CHUNK = 3180;
  if (value.length <= CHUNK) return `${name}=${value}`;
  const parts: string[] = [];
  for (let i = 0; i * CHUNK < value.length; i++) {
    parts.push(`${name}.${i}=${value.slice(i * CHUNK, (i + 1) * CHUNK)}`);
  }
  return parts.join("; ");
}

async function main() {
  console.log(`\nSmoke test → ${BASE}\n${"═".repeat(50)}`);

  // ---------- unauthenticated behaviour ----------
  section("Public surface");

  const loginRes = await fetch(`${BASE}/login`, { redirect: "manual" });
  const loginHtml = await loginRes.text();
  check("sign-in page loads", loginRes.status === 200, `HTTP ${loginRes.status}`);
  check(
    "sign-in page is white-labelled",
    !loginHtml.includes("EstateFlow") || !!process.env.NEXT_PUBLIC_BRAND_NAME?.includes("EstateFlow"),
    "template brand still visible"
  );

  const signupRes = await fetch(`${BASE}/signup`, { redirect: "manual" });
  check(
    "public signup is closed",
    signupRes.status === 307 || signupRes.status === 308,
    `expected redirect, got ${signupRes.status}`
  );

  const protectedRes = await fetch(`${BASE}/dashboard`, { redirect: "manual" });
  check(
    "dashboard requires sign-in",
    protectedRes.status === 307 || protectedRes.status === 308,
    `expected redirect, got ${protectedRes.status}`
  );

  // ---------- security ----------
  section("Security");

  const badSecret = await fetch(`${BASE}/api/webhooks/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-webhook-secret": "wrong" },
    body: JSON.stringify({ fullName: "Intruder", phone: "+910000000000" }),
  });
  check("lead webhook rejects a wrong secret", badSecret.status === 401, `HTTP ${badSecret.status}`);

  const unsignedVoice = await fetch(
    `${BASE}/api/twilio/voice?step=agent-answer&callId=00000000-0000-0000-0000-000000000000`,
    { method: "POST" }
  );
  check("Twilio voice rejects unsigned requests", unsignedVoice.status === 403, `HTTP ${unsignedVoice.status}`);

  const unsignedStatus = await fetch(
    `${BASE}/api/twilio/status?callId=00000000-0000-0000-0000-000000000000&leg=agent`,
    { method: "POST" }
  );
  check("Twilio status rejects unsigned requests", unsignedStatus.status === 403, `HTTP ${unsignedStatus.status}`);

  // ---------- sign in ----------
  section("Authentication");

  const supabase = createClient(SUPABASE_URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });
  check("admin can sign in", !authErr && !!auth.session, authErr?.message);
  if (!auth.session) throw new Error("Cannot continue without a session");

  const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];
  const cookie = sessionCookies(projectRef, auth.session);

  const authed = (path: string, init: RequestInit = {}) =>
    fetch(`${BASE}${path}`, {
      ...init,
      headers: { ...(init.headers || {}), cookie, Accept: "text/html" },
      redirect: "manual",
    });

  const dash = await authed("/dashboard");
  const dashHtml = await dash.text();
  check("dashboard loads when signed in", dash.status === 200, `HTTP ${dash.status}`);
  check(
    "dashboard greets the signed-in user",
    /Good (morning|afternoon|evening)/.test(dashHtml)
  );

  // ---------- every route ----------
  section("All routes");

  const routes = [
    "/dashboard", "/leads", "/leads/new", "/leads/board", "/leads/import",
    "/properties", "/properties/new", "/followups", "/tasks", "/attendance",
    "/social", "/social/new", "/team", "/reports", "/notifications",
    "/settings", "/settings/integrations", "/more",
  ];
  let routeFailures = 0;
  for (const r of routes) {
    const res = await authed(r);
    const html = await res.text();
    const broken = res.status !== 200 || /500: Internal|Application error/i.test(html);
    if (broken) {
      routeFailures++;
      console.log(`      ✖ ${r} — HTTP ${res.status}`);
    }
  }
  check(`all ${routes.length} routes render`, routeFailures === 0, `${routeFailures} failed`);

  const missing = await authed("/leads/00000000-0000-0000-0000-000000000000");
  const missingHtml = await missing.text();
  // Next.js streams the shell before notFound() runs, so the status stays 200.
  // What matters to the client is that they see the not-found screen, not a crash.
  check(
    "unknown record shows the not-found screen, not a crash",
    missingHtml.includes("Page not found") &&
      !/Application error|500: Internal/i.test(missingHtml)
  );

  // ---------- core business flow ----------
  section("Lead intake → assignment → bridge call");

  const phone = `+9198${Date.now().toString().slice(-8)}`;
  const hookRes = await fetch(`${BASE}/api/webhooks/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-webhook-secret": WEBHOOK_SECRET },
    body: JSON.stringify({
      fullName: "Smoke Test Lead",
      phone,
      source: "36 Acre",
      propertyType: "3BHK",
      budgetMin: 8000000,
      budgetMax: 12000000,
      preferredLocation: "Whitefield",
    }),
  });
  const hookBody = await hookRes.json().catch(() => ({}));
  check("lead webhook accepts a valid lead", hookRes.status === 201, `HTTP ${hookRes.status}`);
  check("lead was persisted", !!hookBody.leadId);

  if (hookBody.leadId) {
    const service = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });

    const { data: lead } = await service
      .from("leads")
      .select("full_name, source, property_type, status, assigned_agent_id")
      .eq("id", hookBody.leadId)
      .single();

    check('source "36 Acre" normalised to 36acre', lead?.source === "36acre", lead?.source);
    check('property type "3BHK" normalised to apartment', lead?.property_type === "apartment", lead?.property_type ?? "null");

    // The bridge call runs after the response; give it a moment.
    await new Promise((r) => setTimeout(r, 4000));

    const { count: agentCount } = await service
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "sales_agent")
      .eq("is_active", true);
    const hasAgents = (agentCount ?? 0) > 0;

    const { data: calls } = await service
      .from("calls")
      .select("status, outcome, duration, is_dry_run")
      .eq("lead_id", hookBody.leadId);

    if (hasAgents) {
      check("lead was auto-assigned to an agent", !!lead?.assigned_agent_id);
      check("a call record was created", (calls?.length ?? 0) > 0);
      if (calls?.length) {
        check(
          "bridge call reached a terminal state",
          ["completed", "agent_no_answer", "lead_no_answer", "failed"].includes(calls[0].status),
          calls[0].status
        );
      }
    } else {
      // A newly provisioned org has no agents yet. The correct behaviour is to
      // park the lead as Call Pending and raise a follow-up — never to drop it.
      console.log("      (no sales agents yet — verifying the fallback path)");
      const { data: parked } = await service
        .from("leads")
        .select("status")
        .eq("id", hookBody.leadId)
        .single();
      check('lead parked as "Call Pending" when no agent exists', parked?.status === "call_pending", parked?.status);

      const { count: followups } = await service
        .from("followups")
        .select("id", { count: "exact", head: true })
        .eq("lead_id", hookBody.leadId);
      check("a follow-up task was raised so the lead is not lost", (followups ?? 0) > 0);

      const { count: notes } = await service
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("type", "missed_lead_call");
      check("managers were notified about the missed call", (notes ?? 0) > 0);
    }

    const { data: activities } = await service
      .from("activities")
      .select("type")
      .eq("lead_id", hookBody.leadId);
    check("lead timeline was populated", (activities?.length ?? 0) >= 1, `${activities?.length ?? 0} entries`);

    const detail = await authed(`/leads/${hookBody.leadId}`);
    check("new lead's detail page renders", detail.status === 200, `HTTP ${detail.status}`);

    // Clean up so repeated runs don't accumulate test data.
    await service.from("leads").delete().eq("id", hookBody.leadId);
  }

  // ---------- summary ----------
  console.log(`\n${"═".repeat(50)}`);
  if (failures.length) {
    console.log(`✖ SMOKE TEST FAILED — ${passed} passed, ${failures.length} failed\n`);
    failures.forEach((f) => console.log(`   • ${f}`));
    console.log("");
    process.exit(1);
  }
  console.log(`✓ SMOKE TEST PASSED — ${passed} checks\n`);
}

main().catch((e) => {
  console.error(`\n✖ ${e instanceof Error ? e.message : e}\n`);
  process.exit(1);
});
