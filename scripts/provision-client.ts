/**
 * One-command client provisioning.
 *
 * Creates a brand-new client deployment's data: the organization, the admin
 * login, and their integration defaults. Safe to re-run — it will not duplicate
 * an existing organization or user.
 *
 * Usage:
 *   1. Point .env.local at the CLIENT's Supabase project
 *   2. npm run provision
 *
 * Reads (prompts if absent):
 *   CLIENT_ORG_NAME       "Skyline Realty"
 *   CLIENT_ADMIN_EMAIL    "owner@skylinerealty.in"
 *   CLIENT_ADMIN_NAME     "Rajesh Skyline"
 *   CLIENT_ADMIN_PHONE    "+919810000000"
 *   CLIENT_ADMIN_PASSWORD (generated if omitted — printed once)
 *   CLIENT_ORG_PHONE / CLIENT_ORG_EMAIL / CLIENT_ORG_ADDRESS  (optional)
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// ---------- env loading ----------
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "\n✖ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local\n"
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const rl = createInterface({ input: process.stdin, output: process.stdout });

async function ask(label: string, envKey: string, fallback = ""): Promise<string> {
  const preset = process.env[envKey];
  if (preset) return preset;
  const answer = (await rl.question(`${label}${fallback ? ` [${fallback}]` : ""}: `)).trim();
  return answer || fallback;
}

/** Readable, strong default password the client is told to change. */
function generatePassword(): string {
  return `${randomBytes(6).toString("base64url")}-${randomBytes(4).toString("hex")}`;
}

function line(char = "─", n = 62) {
  return char.repeat(n);
}

async function main() {
  console.log(`\n${line("═")}\n  CLIENT PROVISIONING\n${line("═")}\n`);
  console.log(`Target Supabase project: ${url}\n`);

  const orgName = await ask("Client business name", "CLIENT_ORG_NAME");
  if (!orgName) throw new Error("Business name is required");

  const adminEmail = (await ask("Admin email", "CLIENT_ADMIN_EMAIL")).toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(adminEmail)) throw new Error("Valid admin email is required");

  const adminName = await ask("Admin full name", "CLIENT_ADMIN_NAME", "Administrator");
  const adminPhone = await ask("Admin phone", "CLIENT_ADMIN_PHONE", "");
  const orgPhone = await ask("Business phone (public share pages)", "CLIENT_ORG_PHONE", "");
  const orgEmail = await ask("Business email", "CLIENT_ORG_EMAIL", "");
  const orgAddress = await ask("Business address", "CLIENT_ORG_ADDRESS", "");

  rl.close();

  const password = process.env.CLIENT_ADMIN_PASSWORD || generatePassword();
  const generated = !process.env.CLIENT_ADMIN_PASSWORD;

  console.log(`\n${line()}`);

  // ---------- 1. Verify schema is present ----------
  const { error: schemaErr } = await admin.from("organizations").select("id").limit(1);
  if (schemaErr) {
    console.error(
      `\n✖ Database schema not found (${schemaErr.message}).\n` +
        `  Run the migrations first:\n` +
        `    supabase db push --db-url "postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres"\n`
    );
    process.exit(1);
  }
  console.log("✓ Schema present");

  // ---------- 2. Organization ----------
  const { data: existingOrgs } = await admin
    .from("organizations")
    .select("id, name")
    .eq("name", orgName)
    .limit(1);

  let orgId: string;
  if (existingOrgs?.length) {
    orgId = existingOrgs[0].id;
    console.log(`= Organization already exists: ${orgName}`);
  } else {
    const { data: org, error } = await admin
      .from("organizations")
      .insert({
        name: orgName,
        phone: orgPhone || null,
        email: orgEmail || null,
        address: orgAddress || null,
      })
      .select("id")
      .single();
    if (error || !org) throw new Error(`Creating organization failed: ${error?.message}`);
    orgId = org.id;
    console.log(`✓ Organization created: ${orgName}`);
  }

  // ---------- 3. Admin user ----------
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: adminEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: adminName, phone: adminPhone || undefined },
  });

  let adminId: string;
  let passwordIsNew = true;

  if (createErr) {
    if (!createErr.message.includes("already been registered")) {
      throw new Error(`Creating admin failed: ${createErr.message}`);
    }
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("email", adminEmail)
      .single();
    if (!existing) throw new Error("Admin exists in auth but has no profile row");
    adminId = existing.id;
    passwordIsNew = false;
    console.log(`= Admin already exists: ${adminEmail} (password unchanged)`);
  } else {
    adminId = created.user!.id;
    console.log(`✓ Admin created: ${adminEmail}`);
  }

  // ---------- 4. Attach admin to the org with the admin role ----------
  const { error: profileErr } = await admin
    .from("profiles")
    .update({
      organization_id: orgId,
      role: "admin",
      full_name: adminName,
      phone: adminPhone || null,
      is_active: true,
    })
    .eq("id", adminId);
  if (profileErr) throw new Error(`Attaching admin to org failed: ${profileErr.message}`);
  console.log("✓ Admin linked to organization");

  // ---------- 5. Integration defaults ----------
  const webhookSecret = randomBytes(24).toString("hex");
  const { data: existingSettings } = await admin
    .from("integration_settings")
    .select("organization_id, lead_webhook_secret")
    .eq("organization_id", orgId)
    .maybeSingle();

  if (existingSettings) {
    console.log("= Integration settings already present");
  } else {
    const { error: settingsErr } = await admin.from("integration_settings").insert({
      organization_id: orgId,
      lead_webhook_secret: webhookSecret,
      default_assignment_mode: "round_robin",
      whatsapp_mode: "deep_link",
      dry_run: true, // client turns this off after entering Twilio details
    });
    if (settingsErr) throw new Error(`Creating settings failed: ${settingsErr.message}`);
    console.log("✓ Integration defaults created (test mode ON)");
  }

  const finalSecret = existingSettings?.lead_webhook_secret ?? webhookSecret;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://YOUR-APP.vercel.app";

  // ---------- Handover summary ----------
  console.log(`\n${line("═")}\n  HANDOVER DETAILS — send these to the client\n${line("═")}\n`);
  console.log(`  App URL         ${appUrl}`);
  console.log(`  Admin email     ${adminEmail}`);
  if (passwordIsNew) {
    console.log(`  Password        ${password}${generated ? "   (generated)" : ""}`);
    console.log(`                  ↳ ask them to change it after first sign-in`);
  }
  console.log(`\n  Organization ID ${orgId}`);
  console.log(`  Webhook URL     ${appUrl}/api/webhooks/leads`);
  console.log(`  Webhook secret  ${finalSecret}`);
  console.log(`\n${line()}`);
  console.log("  NEXT STEPS");
  console.log(`${line()}`);
  console.log("  1. Set these on the deployment (Vercel → Environment Variables):");
  console.log(`       NEXT_PUBLIC_BRAND_NAME=${orgName} CRM`);
  console.log(`       NEXT_PUBLIC_BRAND_SHORT_NAME=${orgName.split(/\s+/)[0]}`);
  console.log(`       NEXT_PUBLIC_APP_URL=${appUrl}`);
  console.log(`       LEAD_WEBHOOK_SECRET=${finalSecret}`);
  console.log("       SECRETS_ENCRYPTION_KEY=$(openssl rand -base64 32)");
  console.log("  2. Redeploy so branding applies.");
  console.log("  3. Walk the client through docs/CLIENT-ADMIN-GUIDE.md.");
  console.log("  4. Client enters Twilio details, then turns OFF test mode.\n");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    rl.close();
    console.error(`\n✖ ${e instanceof Error ? e.message : e}\n`);
    process.exit(1);
  });
