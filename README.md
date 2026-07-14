# EstateFlow CRM

A production-ready, **mobile-first real estate CRM** for sales teams: instant agent‑to‑lead call bridging, one‑click property sharing over WhatsApp/SMS/email, one‑click follow‑ups, inventory management, GPS attendance, a social media planner, and business reports — multi‑tenant with role‑based access.

**Stack:** Next.js 15 (App Router, TypeScript) · Tailwind CSS v4 · shadcn/ui · Supabase (Postgres, Auth, Storage, Realtime, RLS) · Twilio Voice + SMS/WhatsApp · Resend · OpenAI‑compatible AI adapter · Vercel

---

## Feature overview

| Module | Highlights |
|---|---|
| **Leads** | Search/filters, timeline (calls, messages, notes, shares), status/temperature, assign/reassign, one‑click actions |
| **Instant call bridge** | New lead → system calls the agent → "press any key" → lead is dialed into a conference. Retries next agent, falls back to *Call Pending* + manager alert |
| **Lead webhook** | `POST /api/webhooks/leads` for 36 Acre, MagicBricks, website forms, Zapier/Make, FB Lead Ads. Round‑robin / least‑busy auto‑assignment |
| **Properties** | Inventory with photos (Supabase Storage), filters, public share pages (`/p/<token>`), one‑click send to lead |
| **Follow‑ups** | Templates, overdue/today/upcoming tabs, complete/snooze, reminders |
| **Attendance** | GPS check‑in/out, late detection, admin team view, history |
| **Social** | Content calendar, drafts, AI caption helper, webhook hand‑off to Zapier/Buffer |
| **Dashboard & Reports** | Today's KPIs, activity feed, leads by source/status, agent call performance, won/lost, attendance summary |
| **Roles** | Admin, Sales Manager, Sales Agent, Field Executive, Social Media Manager — org‑scoped RLS on every table |

**Dry‑run mode (default):** every external integration (Twilio, WhatsApp, email, AI, social webhook) is wrapped in a service adapter that *simulates* the operation when keys are missing or dry‑run is on — identical DB writes, timelines and reports, no external calls. Configure keys later in **Settings → Integrations** without code changes.

---

## 1 · Local development setup

### Prerequisites
- Node.js 20+ (tested on 24)
- A free [Supabase](https://supabase.com) project

### Steps

```bash
git clone https://github.com/dhruvb2028/Real-Estate-CRM.git
cd Real-Estate-CRM
npm install
cp .env.example .env.local
```

1. **Create a Supabase project** → Project Settings → API. Copy into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (Service role — server only)

2. **Run the migrations** in the Supabase **SQL Editor**, in order:
   1. `supabase/migrations/0001_schema.sql`
   2. `supabase/migrations/0002_functions.sql`
   3. `supabase/migrations/0003_rls.sql`

   *(Or with the Supabase CLI: `supabase db push`.)*

3. **Seed demo data** (optional but recommended):

   ```bash
   npm run seed:users          # creates auth users + demo org via the Admin API
   ```

   Then run `supabase/seed.sql` in the SQL Editor (adds 20 leads, 10 properties, calls, follow‑ups, attendance, social posts).

   **Demo logins** (password `EstateFlow@123`):
   | Email | Role |
   |---|---|
   | `admin@estateflow.demo` | Admin |
   | `manager@estateflow.demo` | Sales Manager |
   | `agent1@estateflow.demo` / `agent2@estateflow.demo` | Sales Agents |
   | `field@estateflow.demo` | Field Executive |
   | `social@estateflow.demo` | Social Media Manager |

4. **Start the app:**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000 — sign in, or create a fresh workspace via **Sign up**.

> **Email confirmation:** for local dev, turn off "Confirm email" under Supabase → Authentication → Providers → Email, or confirm users manually. The seed script creates pre‑confirmed users.

---

## 2 · Lead intake webhook

`POST /api/webhooks/leads` accepts leads from any external platform.

**Auth:** send the org's webhook secret in the `x-webhook-secret` header (see **Settings → Integrations**, or `LEAD_WEBHOOK_SECRET` in env for single‑tenant dev). Add `x-organization-id: <org uuid>` when using the env‑level secret with multiple orgs.

**Test with curl:**

```bash
curl -X POST http://localhost:3000/api/webhooks/leads \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: YOUR_SECRET" \
  -d '{
    "fullName": "Rahul Sharma",
    "phone": "+919999999999",
    "email": "rahul@example.com",
    "source": "36 Acre",
    "propertyType": "Apartment",
    "budgetMin": 7500000,
    "budgetMax": 12000000,
    "preferredLocation": "Gurgaon",
    "notes": "Looking for 3BHK near Golf Course Road"
  }'
```

**What happens:** lead saved → round‑robin assigned → in‑app notification to the agent → **bridge call triggered** (simulated in dry‑run — watch the lead's timeline update) → `201 { ok, leadId, assignedAgentId }`.

Field aliases are tolerated (`name`/`full_name`, `phoneNumber`/`mobile`, `budget_min`, …) and sources are normalized ("36 Acre" → `36acre`, "Facebook Ads" → `facebook`, …). Postman: import the curl above.

---

## 3 · Twilio setup (real calls)

1. Buy a Twilio number with Voice + SMS. For WhatsApp, enable the WhatsApp sender (sandbox works for dev).
2. Fill **Settings → Integrations** (or env vars): Account SID, Auth Token, phone number, WhatsApp sender.
3. Set `NEXT_PUBLIC_APP_URL` to a **publicly reachable URL** — Twilio must call your webhooks. For local dev use a tunnel:
   ```bash
   ngrok http 3000   # then NEXT_PUBLIC_APP_URL=https://<id>.ngrok.app
   ```
4. Turn **off** dry‑run in Settings → Integrations (and remove `DRY_RUN=true` from env).

**Call flow:** webhook lead → Twilio calls the agent → agent hears *"New real estate lead from {source}. Press any key to connect with {name}."* → keypress puts the agent in a conference and dials the lead into it → status callbacks log status, duration and recording on the `calls` table. No answer → next agent (up to 3) → lead marked **Call Pending**, follow‑up task created, managers notified.

Twilio webhooks used (configured automatically per call): `/api/twilio/voice` (TwiML steps) and `/api/twilio/status` (status callbacks).

---

## 4 · Deployment (Vercel + Supabase)

1. Push this repo to GitHub and import it in [Vercel](https://vercel.com).
2. Add the environment variables from `.env.example` in Vercel Project Settings (at minimum the three Supabase vars + `NEXT_PUBLIC_APP_URL=https://your-app.vercel.app`).
3. Deploy. Run migrations/seed against your production Supabase project (step 1.2–1.3).
4. Point your lead sources at `https://your-app.vercel.app/api/webhooks/leads`.
5. In Supabase → Authentication → URL Configuration, set Site URL to your Vercel URL.

---

## 5 · Architecture

```
src/
  app/
    (auth)/            login, signup, invite/[token]
    (app)/             authed shell: dashboard, leads, properties, followups,
                       attendance, social, team, reports, settings, more
    p/[shareToken]/    public property share page (anon, via SECURITY DEFINER RPC)
    api/
      webhooks/leads/  lead intake
      twilio/voice     TwiML for the bridge steps
      twilio/status    status callbacks
  components/          ui/ (shadcn) + per-module components
  lib/                 supabase clients, types, constants/templates, zod validations
  server/
    actions/           server actions per module (auth, leads, followups, …)
    queries/           data-access layer per module
  services/            adapter layer — callService, messageService, emailService,
                       aiService, leadAssignmentService, propertyShareService,
                       attendanceService, socialPostService, notificationService
supabase/
  migrations/          0001 schema · 0002 functions · 0003 RLS + storage + realtime
  seed.sql             demo data (run after scripts/seed-users.ts)
scripts/seed-users.ts  creates demo auth users via the Admin API
```

**Design rules**
- UI components never talk to Twilio/Resend/OpenAI — only services do, each with production + dry‑run modes.
- Every table carries `organization_id`; RLS scopes all access via `get_user_org()`. Role‑gated writes via `is_org_manager()` / role checks.
- Webhook + bridge + cross‑user notifications use the service‑role client (trusted server paths only).
- Zod validates all input server‑side; UI includes loading, empty, and error states, and destructive actions confirm first.

## Environment variables

See [.env.example](.env.example) — Supabase (required), app URL, dry‑run flag, webhook secret, Twilio, Resend, OpenAI‑compatible AI, social webhook.
