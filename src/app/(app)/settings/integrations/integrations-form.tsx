"use client";

import { useActionState, useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  FlaskConical,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { saveIntegrationSettings } from "@/server/actions/settings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/layout/submit-button";
import { UNCHANGED_SECRET } from "@/lib/secrets";
import type { AssignmentMode, WhatsappMode } from "@/lib/types";



/**
 * Settings shape sent to the browser. Secret values are deliberately absent —
 * only whether each one is configured — so tokens never appear in page HTML.
 */
export interface SafeIntegrationSettings {
  twilio_account_sid: string | null;
  twilio_phone_number: string | null;
  whatsapp_sender: string | null;
  lead_webhook_secret: string;
  openai_base_url: string | null;
  social_webhook_url: string | null;
  default_assignment_mode: AssignmentMode;
  dry_run: boolean;
  whatsapp_mode: WhatsappMode;
  hasTwilioAuthToken: boolean;
  hasResendApiKey: boolean;
  hasOpenaiApiKey: boolean;
}

/** Password input that shows "configured" state without revealing the value. */
function SecretInput({
  id,
  name,
  label,
  isSet,
  placeholder,
}: {
  id: string;
  name: string;
  label: string;
  isSet: boolean;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(!isSet);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {isSet && !editing && (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" aria-hidden /> Configured
          </span>
        )}
      </div>
      {editing ? (
        <Input
          id={id}
          name={name}
          type="password"
          autoComplete="off"
          className="h-11 font-mono text-xs"
          placeholder={placeholder}
        />
      ) : (
        <div className="flex gap-2">
          <Input
            readOnly
            value="••••••••••••••••"
            className="h-11 font-mono text-xs"
            aria-label={`${label} (hidden)`}
          />
          {/* Posting the sentinel tells the server to keep the stored value. */}
          <input type="hidden" name={name} value={UNCHANGED_SECRET} />
          <Button
            type="button"
            variant="outline"
            className="h-11 shrink-0"
            onClick={() => setEditing(true)}
          >
            Replace
          </Button>
        </div>
      )}
    </div>
  );
}

export function IntegrationsForm({
  settings,
  webhookEndpoint,
  orgId,
}: {
  settings: SafeIntegrationSettings | null;
  webhookEndpoint: string;
  orgId: string;
}) {
  const [state, formAction] = useActionState(saveIntegrationSettings, {});
  const [copied, setCopied] = useState<string | null>(null);
  const [whatsappMode, setWhatsappMode] = useState<WhatsappMode>(
    settings?.whatsapp_mode ?? "deep_link"
  );

  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
    else if (state.ok === false && state.error) toast.error(state.error);
  }, [state]);

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("Copied");
    setTimeout(() => setCopied(null), 2000);
  }

  const curlExample = `curl -X POST ${webhookEndpoint} \\
  -H "Content-Type: application/json" \\
  -H "x-webhook-secret: ${settings?.lead_webhook_secret ?? "YOUR_SECRET"}" \\
  -H "x-organization-id: ${orgId}" \\
  -d '{"fullName":"Rahul Sharma","phone":"+919999999999","source":"36 Acre","propertyType":"Apartment","budgetMin":7500000,"budgetMax":12000000,"preferredLocation":"Gurgaon"}'`;

  return (
    <form action={formAction} className="space-y-4">
      {/* Dry-run mode */}
      <Card>
        <CardContent className="pt-6">
          <label className="flex cursor-pointer items-center justify-between gap-4">
            <span>
              <span className="flex items-center gap-2 font-semibold">
                <FlaskConical className="size-4 text-primary" aria-hidden />
                Test mode
              </span>
              <span className="mt-0.5 block text-sm text-muted-foreground">
                Simulate calls and messages without contacting providers. Turn this off
                once your Twilio details below are saved and you&apos;re ready for real
                calls.
              </span>
            </span>
            <Switch
              name="dryRun"
              value="true"
              defaultChecked={settings?.dry_run ?? true}
              aria-label="Test mode"
            />
          </label>
        </CardContent>
      </Card>

      {/* Lead webhook */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Lead intake webhook</CardTitle>
          <CardDescription>
            Point 36 Acre, MagicBricks, your website forms, Zapier or Make at this
            endpoint. New leads arrive instantly and trigger the bridge call.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Endpoint</Label>
            <div className="flex gap-2">
              <Input readOnly value={webhookEndpoint} className="h-11 text-xs" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 shrink-0"
                onClick={() => copy(webhookEndpoint, "endpoint")}
                aria-label="Copy webhook endpoint"
              >
                {copied === "endpoint" ? (
                  <Check className="size-4 text-primary" aria-hidden />
                ) : (
                  <Copy className="size-4" aria-hidden />
                )}
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="int-secret">Webhook secret (x-webhook-secret header)</Label>
            <Input
              id="int-secret"
              name="leadWebhookSecret"
              defaultValue={settings?.lead_webhook_secret ?? ""}
              required
              minLength={12}
              className="h-11 font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Test with curl</Label>
            <div className="relative">
              <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-[11px] leading-relaxed">
                {curlExample}
              </pre>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute right-2 top-2 size-9"
                onClick={() => copy(curlExample, "curl")}
                aria-label="Copy curl example"
              >
                {copied === "curl" ? (
                  <Check className="size-3.5 text-primary" aria-hidden />
                ) : (
                  <Copy className="size-3.5" aria-hidden />
                )}
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="int-assign">Lead assignment mode</Label>
            <Select
              name="defaultAssignmentMode"
              defaultValue={settings?.default_assignment_mode ?? "round_robin"}
            >
              <SelectTrigger id="int-assign" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="round_robin">Round robin</SelectItem>
                <SelectItem value="least_busy">Least busy agent</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Twilio */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Twilio — calls & SMS</CardTitle>
          <CardDescription>
            Powers the instant agent-to-lead call bridge. Create a Twilio account,
            buy a number with Voice + SMS, then paste the details here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="tw-sid">Account SID</Label>
            <Input
              id="tw-sid"
              name="twilioAccountSid"
              defaultValue={settings?.twilio_account_sid ?? ""}
              className="h-11 font-mono text-xs"
              placeholder="ACxxxxxxxxxxxxxxxx"
            />
          </div>
          <SecretInput
            id="tw-token"
            name="twilioAuthToken"
            label="Auth token"
            isSet={settings?.hasTwilioAuthToken ?? false}
          />
          <div className="space-y-1.5">
            <Label htmlFor="tw-phone">Voice / SMS number</Label>
            <Input
              id="tw-phone"
              name="twilioPhoneNumber"
              defaultValue={settings?.twilio_phone_number ?? ""}
              className="h-11"
              placeholder="+14155551234"
            />
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="size-4 text-emerald-600" aria-hidden />
            WhatsApp
          </CardTitle>
          <CardDescription>
            Choose how WhatsApp messages leave the CRM.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <input type="hidden" name="whatsappMode" value={whatsappMode} />
          <div className="grid gap-2" role="radiogroup" aria-label="WhatsApp mode">
            <button
              type="button"
              role="radio"
              aria-checked={whatsappMode === "deep_link"}
              onClick={() => setWhatsappMode("deep_link")}
              className={`cursor-pointer rounded-xl border p-3.5 text-left transition-colors ${
                whatsappMode === "deep_link"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-accent"
              }`}
            >
              <span className="flex items-center gap-2 font-semibold">
                Open on agent&apos;s phone
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                  Ready now
                </span>
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Tapping WhatsApp opens the agent&apos;s own app with the message ready to
                send. No setup, no cost, and the lead sees a message from a real person.
              </span>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={whatsappMode === "api"}
              onClick={() => setWhatsappMode("api")}
              className={`cursor-pointer rounded-xl border p-3.5 text-left transition-colors ${
                whatsappMode === "api"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-accent"
              }`}
            >
              <span className="flex items-center gap-2 font-semibold">
                Send automatically via Twilio
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                  Needs approval
                </span>
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Fully automated sending. Requires a Twilio WhatsApp sender approved by
                Meta — apply first, then switch here once approved.
              </span>
            </button>
          </div>

          {whatsappMode === "api" && (
            <div className="space-y-1.5">
              <Label htmlFor="tw-wa">WhatsApp sender number</Label>
              <Input
                id="tw-wa"
                name="whatsappSender"
                defaultValue={settings?.whatsapp_sender ?? ""}
                className="h-11"
                placeholder="whatsapp:+14155238886"
              />
            </div>
          )}
          {whatsappMode !== "api" && (
            <input
              type="hidden"
              name="whatsappSender"
              value={settings?.whatsapp_sender ?? ""}
            />
          )}
        </CardContent>
      </Card>

      {/* Email + AI + Social */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Email, AI & social hand-off</CardTitle>
          <CardDescription>All optional — the CRM works without them.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <SecretInput
            id="int-resend"
            name="resendApiKey"
            label="Resend API key (email sending)"
            isSet={settings?.hasResendApiKey ?? false}
            placeholder="re_..."
          />
          <SecretInput
            id="int-openai"
            name="openaiApiKey"
            label="OpenAI-compatible API key (AI drafting)"
            isSet={settings?.hasOpenaiApiKey ?? false}
            placeholder="sk-..."
          />
          <div className="space-y-1.5">
            <Label htmlFor="int-openai-url">AI base URL</Label>
            <Input
              id="int-openai-url"
              name="openaiBaseUrl"
              defaultValue={settings?.openai_base_url ?? ""}
              className="h-11 text-xs"
              placeholder="https://api.openai.com/v1"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="int-social">
              Social publishing webhook (Zapier / Make / Buffer)
            </Label>
            <Input
              id="int-social"
              name="socialWebhookUrl"
              defaultValue={settings?.social_webhook_url ?? ""}
              className="h-11 text-xs"
              placeholder="https://hooks.zapier.com/..."
            />
          </div>
        </CardContent>
      </Card>

      {state.error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {state.error}
        </p>
      )}

      <SubmitButton>Save integration settings</SubmitButton>
    </form>
  );
}
