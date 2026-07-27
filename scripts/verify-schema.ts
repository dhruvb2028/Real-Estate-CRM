/**
 * Post-migration schema verification.
 *
 * Confirms a freshly provisioned client database has every table, every RLS
 * policy, the helper functions and the storage buckets the app relies on.
 * Run this before handing a deployment to a client.
 *
 *   npm run verify:schema
 */
import { Client } from "pg";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const dbUrl =
  process.env.SUPABASE_DB_URL || process.argv.find((a) => a.startsWith("postgresql://"));
if (!dbUrl) {
  console.error("\n✖ Provide SUPABASE_DB_URL or pass the connection string.\n");
  process.exit(1);
}

const EXPECTED_TABLES = [
  "organizations", "profiles", "team_members", "lead_sources", "leads",
  "properties", "property_images", "property_documents", "lead_property_shares",
  "activities", "calls", "messages", "followups", "attendance", "social_posts",
  "tasks", "integration_settings", "notifications",
];

const EXPECTED_FUNCTIONS = [
  "get_user_org", "get_user_role", "is_org_manager", "handle_new_user",
  "next_round_robin_agent", "next_least_busy_agent", "get_public_property",
  "set_updated_at", "can_see_lead",
];

const EXPECTED_BUCKETS = [
  "property-images", "property-docs", "attendance-selfies", "social-media",
];

async function main() {
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const failures: string[] = [];
  const ok = (m: string) => console.log(`  ✓ ${m}`);
  const bad = (m: string) => {
    console.log(`  ✖ ${m}`);
    failures.push(m);
  };

  // ---- tables ----
  const { rows: tables } = await client.query<{ table_name: string }>(
    `select table_name from information_schema.tables
     where table_schema='public' and table_type='BASE TABLE'`
  );
  const tableNames = tables.map((t) => t.table_name);
  const missingTables = EXPECTED_TABLES.filter((t) => !tableNames.includes(t));
  if (missingTables.length) bad(`missing tables: ${missingTables.join(", ")}`);
  else ok(`all ${EXPECTED_TABLES.length} tables present`);

  // ---- RLS enabled everywhere ----
  const { rows: noRls } = await client.query<{ relname: string }>(
    `select c.relname from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     where n.nspname='public' and c.relkind='r' and c.relrowsecurity = false`
  );
  if (noRls.length) bad(`RLS disabled on: ${noRls.map((r) => r.relname).join(", ")}`);
  else ok("row level security enabled on every table");

  // ---- every table actually has policies ----
  const { rows: policyCounts } = await client.query<{ tablename: string; n: string }>(
    `select tablename, count(*)::text as n from pg_policies
     where schemaname='public' group by tablename`
  );
  const withPolicies = new Set(policyCounts.map((p) => p.tablename));
  const unprotected = EXPECTED_TABLES.filter((t) => !withPolicies.has(t));
  if (unprotected.length) bad(`no policies on: ${unprotected.join(", ")}`);
  else {
    const total = policyCounts.reduce((s, p) => s + Number(p.n), 0);
    ok(`${total} RLS policies across ${withPolicies.size} tables`);
  }

  // ---- functions ----
  const { rows: fns } = await client.query<{ proname: string }>(
    `select p.proname from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace where n.nspname='public'`
  );
  const fnNames = fns.map((f) => f.proname);
  const missingFns = EXPECTED_FUNCTIONS.filter((f) => !fnNames.includes(f));
  if (missingFns.length) bad(`missing functions: ${missingFns.join(", ")}`);
  else ok(`all ${EXPECTED_FUNCTIONS.length} helper functions present`);

  // ---- signup trigger ----
  const { rows: trg } = await client.query(
    `select 1 from pg_trigger where tgname='on_auth_user_created'`
  );
  if (!trg.length) bad("auth signup trigger missing (new users would have no profile)");
  else ok("auth signup trigger installed");

  // ---- storage buckets ----
  const { rows: buckets } = await client.query<{ id: string }>(`select id from storage.buckets`);
  const bucketIds = buckets.map((b) => b.id);
  const missingBuckets = EXPECTED_BUCKETS.filter((b) => !bucketIds.includes(b));
  if (missingBuckets.length) bad(`missing storage buckets: ${missingBuckets.join(", ")}`);
  else ok(`all ${EXPECTED_BUCKETS.length} storage buckets present`);

  // ---- realtime ----
  const { rows: realtime } = await client.query<{ tablename: string }>(
    `select tablename from pg_publication_tables where pubname='supabase_realtime'`
  );
  const rtNames = realtime.map((r) => r.tablename);
  const missingRt = ["notifications", "activities", "calls"].filter((t) => !rtNames.includes(t));
  if (missingRt.length) bad(`realtime not enabled on: ${missingRt.join(", ")}`);
  else ok("realtime enabled on notifications, activities, calls");

  // ---- agents must not be able to read the whole pipeline ----
  // If 0007 failed to apply, leads_select silently falls back to org-wide and
  // every sales agent can export the firm's entire lead list. Catch that here
  // rather than discovering it after handover.
  const { rows: leadPolicy } = await client.query<{ qual: string }>(
    `select qual from pg_policies
     where schemaname='public' and tablename='leads' and policyname='leads_select'`
  );
  if (!leadPolicy.length) {
    bad("leads_select policy missing");
  } else if (!/assigned_agent_id/.test(leadPolicy[0].qual ?? "")) {
    bad("leads_select is org-wide — every agent can read all leads (migration 0007 not applied)");
  } else {
    ok("leads are scoped to the assigned agent (managers still see all)");
  }

  // ---- anon must NOT be able to read business tables directly ----
  const { rows: anonGrants } = await client.query<{ table_name: string }>(
    `select table_name from information_schema.role_table_grants
     where grantee='anon' and table_schema='public'
       and table_name in ('leads','calls','messages','integration_settings')
       and privilege_type='SELECT'`
  );
  // A grant alone is not a leak (RLS still applies), but flag tables with a
  // grant AND a policy that allows anon.
  const { rows: anonPolicies } = await client.query<{ tablename: string }>(
    `select distinct tablename from pg_policies
     where schemaname='public' and 'anon' = any(roles)`
  );
  if (anonPolicies.length) {
    bad(`anon-readable policies found on: ${anonPolicies.map((p) => p.tablename).join(", ")}`);
  } else {
    ok(`no anon-facing policies (${anonGrants.length} default grants are RLS-gated)`);
  }

  await client.end();

  console.log("");
  if (failures.length) {
    console.error(`✖ SCHEMA VERIFICATION FAILED — ${failures.length} problem(s)\n`);
    process.exit(1);
  }
  console.log("✓ Schema verification passed — safe to provision.\n");
}

main().catch((e) => {
  console.error(`\n✖ ${e instanceof Error ? e.message : e}\n`);
  process.exit(1);
});
