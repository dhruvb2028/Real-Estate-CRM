/**
 * Seed auth users + demo organization via the Supabase Admin API.
 *
 * Usage:
 *   1. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   2. npm run seed:users
 *   3. Then run supabase/seed.sql in the Supabase SQL editor.
 *
 * Demo credentials (password for all): EstateFlow@123
 *   admin@estateflow.demo   — Admin
 *   agent1@estateflow.demo  — Sales Agent
 *   agent2@estateflow.demo  — Sales Agent
 *   field@estateflow.demo   — Field Executive
 *   social@estateflow.demo  — Social Media Manager
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Minimal .env.local loader (no dotenv dependency)
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
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = "EstateFlow@123";

type SeedUser = {
  email: string;
  full_name: string;
  phone: string;
  role: string;
  organization_name?: string;
};

const users: SeedUser[] = [
  {
    email: "admin@estateflow.demo",
    full_name: "Aarav Khanna",
    phone: "+919810000100",
    role: "admin",
    organization_name: "EstateFlow Realty",
  },
  { email: "agent1@estateflow.demo", full_name: "Isha Kapoor", phone: "+919810000101", role: "sales_agent" },
  { email: "agent2@estateflow.demo", full_name: "Dev Mehra", phone: "+919810000102", role: "sales_agent" },
  { email: "manager@estateflow.demo", full_name: "Ritika Sood", phone: "+919810000105", role: "sales_manager" },
  { email: "field@estateflow.demo", full_name: "Ravi Yadav", phone: "+919810000103", role: "field_executive" },
  { email: "social@estateflow.demo", full_name: "Tanya Bhalla", phone: "+919810000104", role: "social_media_manager" },
];

async function main() {
  let orgId: string | null = null;

  for (const u of users) {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: u.full_name,
        phone: u.phone,
        // Only the admin bootstraps the org; others are attached below.
        ...(u.organization_name ? { organization_name: u.organization_name } : {}),
      },
    });

    if (error) {
      if (error.message.includes("already been registered")) {
        console.log(`= ${u.email} already exists, skipping create`);
      } else {
        throw new Error(`Failed creating ${u.email}: ${error.message}`);
      }
    } else {
      console.log(`+ Created ${u.email} (${u.role})`);
    }

    if (u.role === "admin") {
      // Fetch the org the trigger created for the admin
      const { data: profile, error: pErr } = await admin
        .from("profiles")
        .select("organization_id")
        .eq("email", u.email)
        .single();
      if (pErr || !profile?.organization_id) {
        throw new Error(`Admin profile/org not found: ${pErr?.message}`);
      }
      orgId = profile.organization_id;
    } else if (orgId) {
      // Attach non-admin users to the admin's org with their role
      const userId =
        data?.user?.id ??
        (await admin.from("profiles").select("id").eq("email", u.email).single()).data?.id;
      if (!userId) throw new Error(`Could not resolve user id for ${u.email}`);
      const { error: upErr } = await admin
        .from("profiles")
        .update({ organization_id: orgId, role: u.role })
        .eq("id", userId);
      if (upErr) throw new Error(`Failed attaching ${u.email} to org: ${upErr.message}`);
    }
  }

  console.log(`\nDone. Org: ${orgId}`);
  console.log(`Password for all demo users: ${PASSWORD}`);
  console.log("Now run supabase/seed.sql in the Supabase SQL editor.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
