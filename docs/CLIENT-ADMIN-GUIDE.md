# Administrator Guide

Everything you need to run your CRM. Written for the business owner or office
admin — no technical background assumed.

---

## 1. First sign-in

1. Open the app link we sent you on your phone or laptop.
2. Sign in with the admin email and password from your handover sheet.
3. Go to **More → Settings** and change your password immediately.

> **Add it to your phone's home screen.** On Android tap ⋮ → *Add to Home screen*;
> on iPhone tap Share → *Add to Home Screen*. It then opens like a normal app.

---

## 2. Add your team

**More → Team → Invite**

Choose the right role — it controls what each person can see:

| Role | What they can do |
|---|---|
| **Admin** | Everything, including integrations and billing settings |
| **Sales Manager** | See all leads, assign them, track agent performance, view reports |
| **Sales Agent** | Their own assigned leads: call, message, share properties, follow up |
| **Field Executive** | Attendance and assigned site visits |
| **Social Media Manager** | The content calendar only |

The invite link is emailed and also shown on screen so you can send it on
WhatsApp. Links expire after 7 days; revoke one any time with the ✕ button.

---

## 3. Turn on real calling (important)

Your CRM starts in **Test mode** — calls and messages are simulated so you can
explore safely. To make real calls:

1. Create a Twilio account at [twilio.com](https://www.twilio.com/try-twilio).
2. Buy a phone number with **Voice** and **SMS** enabled
   (Console → Phone Numbers → Buy a number).
3. From the Twilio Console home page copy your **Account SID** and **Auth Token**.
4. In the CRM: **More → Integrations** → paste all three → **Save**.
5. Turn **Test mode OFF** and save again.

Now, whenever a new lead arrives, the system calls the assigned agent first,
says *"New real estate lead from {source}. Press any key to connect with
{name}"*, and on any keypress dials the lead and joins both on the call.

> **Costs:** Twilio bills you directly, per minute. Keep a balance topped up —
> if it runs out, calls stop.

---

## 4. Connect your lead sources

**More → Integrations → Lead intake webhook**

Copy the **Endpoint URL** and **secret**, then give them to whoever manages each
source:

- **36 Acre / MagicBricks / Housing.com** — their support team can configure a
  lead push; send them the URL and secret.
- **Facebook / Instagram Lead Ads** — connect via Zapier or Make: trigger
  "New Lead", action "Webhook → POST" to your endpoint, with the secret in a
  header named `x-webhook-secret`.
- **Your website form** — send your developer the URL, the secret, and the
  sample request shown on that page.

Every lead that arrives is saved, auto-assigned to an agent by round-robin, and
triggers the instant bridge call.

---

## 5. Day-to-day use

### Leads
- **Leads** tab shows everything. Tap the filter icon to narrow by source,
  temperature or agent; tap a status chip for one-tap filtering.
- Open a lead for one-tap **Call**, **Message**, **Share property** and
  **Follow-up**.
- **Pipeline view** (the board icon) shows leads by stage — move a lead with the
  arrow button on its card.
- **Import** brings in a CSV; **Export** downloads everything for Excel.

### Properties
- Add listings with photos, price, size and amenities.
- Every property gets a **public share page** — a clean, branded page you can
  send to any buyer. No login needed on their side.
- From a lead, tap **Property** to send that page over WhatsApp, SMS or email in
  one tap. It's logged on the lead's timeline automatically.

### Follow-ups
Overdue / Today / Upcoming tabs. Tap **Done** when handled or **Snooze** to push
it out. Nothing gets forgotten.

### Attendance
Staff tap **Check in** at the start of the day (location is captured, selfie
optional) and **Check out** at the end. Late arrivals are flagged and you get a
notification. Admins see who's currently working under *Team today*.

### Reports
Leads by source, leads by stage, won vs lost, agent call performance,
follow-ups completed, and attendance — last 30 days.

---

## 6. WhatsApp

By default, tapping WhatsApp opens **your agent's own WhatsApp** with the message
already typed — they just hit send. This works immediately, costs nothing, and
your buyer sees a message from a real person rather than a business bot.

If you later want fully automatic sending, you'll need a Twilio WhatsApp sender
approved by Meta (allow 1–3 weeks). Once approved, switch the mode in
**Integrations → WhatsApp**.

---

## 7. Common questions

**A lead came in but nobody was called.**
Check: is Test mode still on? Are Twilio details saved? Does the assigned agent
have a phone number on their profile? Is your Twilio balance positive?

**A lead shows "Call Pending".**
Nobody answered after three attempts. A follow-up task was created
automatically and your managers were notified.

**Can I change what the app is called?**
Yes — it's your brand. Contact us and we'll update it.

**Is my data private?**
Your CRM runs on your own database, separate from every other customer. Staff
only see data belonging to your business, enforced at the database level.

**Someone left the company.**
**More → Team** → switch them to inactive. Their history stays intact.

---

## Support

{{SUPPORT_BLOCK}}
