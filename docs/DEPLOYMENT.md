# Deployment Runbook — new client in ~30 minutes

Repeat this for every client. Each client gets their **own** Supabase project and
their **own** Vercel deployment — no data is ever shared between clients.

---

## 0. Before you start

Collect from the client:

- Business name (exact spelling — it becomes the brand)
- Owner/admin email and full name
- Business phone (shown to buyers on shared property pages)
- Logo file, if they have one
- Preferred domain, e.g. `crm.theirdomain.com`

---

## 1. Create the client's Supabase project (5 min)

1. [supabase.com](https://supabase.com) → **New project**
2. Name it after the client. **Choose the region nearest their office** —
   for India that's `ap-south-1 (Mumbai)`. This is the single biggest factor in
   how fast the app feels.
3. Save the database password in your password manager.
4. Wait for provisioning (~2 min).

> Free tier pauses after a week of inactivity. For a paying client always use a
> paid plan — a paused project means a dead app.

---

## 2. Apply the schema (2 min)

```bash
supabase db push --db-url "postgresql://postgres:DB_PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres"
```

Applies all migrations in order: schema → functions → RLS → share-page docs →
WhatsApp mode.

Confirm in the Supabase dashboard: **Table Editor** should list `leads`,
`properties`, `calls`, etc., and **Authentication → Policies** should show RLS
enabled on every table.

---

## 3. Configure environment (5 min)

Copy `.env.example` to `.env.local` and fill in from
**Supabase → Project Settings → API**:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...        # publishable / anon key
SUPABASE_SERVICE_ROLE_KEY=...            # secret / service_role key
NEXT_PUBLIC_APP_URL=https://crm.theirdomain.com

# Brand — this is what makes it *their* product
NEXT_PUBLIC_BRAND_NAME=Skyline Realty CRM
NEXT_PUBLIC_BRAND_SHORT_NAME=Skyline
NEXT_PUBLIC_BRAND_TAGLINE=Close more deals, faster.
NEXT_PUBLIC_BRAND_SUPPORT_EMAIL=you@youragency.com
NEXT_PUBLIC_BRAND_SUPPORT_PHONE=+91...

# Security — generate a fresh one per client
SECRETS_ENCRYPTION_KEY=   # openssl rand -base64 32
LEAD_WEBHOOK_SECRET=      # openssl rand -hex 24

# Leave signup disabled on client deployments
# NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP=true
```

---

## 4. Provision the client's data (2 min)

```bash
npm run provision
```

Prompts for the business name and admin details, then creates the organization,
the admin login, and integration defaults. It prints a **handover sheet** —
save it; the admin password is shown only once.

Re-running is safe: it detects existing records instead of duplicating them.

### Add at least one Sales Agent before going live

**This matters.** The bridge call needs somebody to ring. Until the client has at
least one active user with the **Sales Agent** role, every incoming lead is
correctly parked as *Call Pending* with a follow-up task — nothing is lost, but
no phone rings.

So before pointing any lead source at the webhook, have the client invite their
agents (**More → Team → Invite**) and make sure every agent's profile has a
phone number saved.

---

## 5. Deploy to Vercel (10 min)

1. Vercel → **Add New → Project** → import this repository.
2. Paste every variable from step 3 into **Environment Variables**
   (Production, Preview and Development).
3. **Deploy.**
4. Add the client's domain under **Settings → Domains** and point their DNS at
   Vercel.
5. Update `NEXT_PUBLIC_APP_URL` to the final domain and **redeploy** — Twilio
   callbacks and share links are built from this value.
6. In Supabase → **Authentication → URL Configuration**, set Site URL to the
   same domain.

---

## 6. Verify before handover (5 min)

Run through this every time:

- [ ] Sign in with the admin account
- [ ] Dashboard loads; branding shows the client's name (not EstateFlow)
- [ ] `/signup` redirects to `/login` (public signup is closed)
- [ ] Create a lead manually → it appears in the list
- [ ] Fire a test webhook (command below) → lead appears, agent assigned
- [ ] Test-mode bridge call appears on the lead's timeline
- [ ] Add a property with a photo → open its public share page in a private window
- [ ] Invite yourself as a Sales Agent → accept → confirm you only see your leads
- [ ] Check in on Attendance
- [ ] Open Reports
- [ ] Open on a real phone; add to home screen

```bash
curl -X POST https://crm.theirdomain.com/api/webhooks/leads \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: THEIR_SECRET" \
  -d '{"fullName":"Test Lead","phone":"+919999999999","source":"36 Acre","preferredLocation":"Gurgaon"}'
```

Expect `201` with `{"ok":true,...}`.

### Or run the whole checklist automatically

```bash
npm run verify:schema     # tables, RLS, policies, functions, buckets, realtime
npm run smoke -- https://crm.theirdomain.com
```

`smoke` signs in, walks all 18 routes, asserts that signup is closed and the
Twilio webhooks reject unsigned requests, then drives a real lead through
intake → assignment → bridge call and cleans up after itself. Green means the
deployment is ready to hand over.

---

## 7. Handover

Send the client:

1. App URL + admin credentials (ask them to change the password)
2. `docs/CLIENT-ADMIN-GUIDE.md` (as PDF)
3. Their webhook URL + secret for their lead sources
4. The Twilio setup steps from section 3 of the admin guide

Book a 30-minute walkthrough. The most valuable thing you can do on that call is
set up Twilio **with** them and watch one real bridge call connect.

---

## Ongoing

**Updating a client to a newer version**
```bash
git pull                    # get the latest template
supabase db push --db-url "..."   # apply any new migrations
git push                    # Vercel redeploys automatically
```
Run `npm test` before pushing to any client.

**Scaling notes**
- The in-memory rate limiter is per instance. A client receiving thousands of
  legitimate leads per hour should move to Upstash Redis
  (`src/lib/security/rate-limit.ts` — same interface).
- Supabase free tier is not appropriate for production; use at least Pro.

**Rotating a leaked secret**
- Webhook secret: change it in Integrations, then update each lead source.
- Twilio token: rotate in Twilio, re-enter in Integrations.
- `SECRETS_ENCRYPTION_KEY`: re-enter integration secrets after changing it —
  values encrypted with the old key can't be read back.
