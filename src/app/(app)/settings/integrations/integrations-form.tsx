"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertCircle, Check, Copy, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { saveIntegrationSettings } from "@/server/actions/settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { IntegrationSettings } from "@/lib/types";

export function IntegrationsForm({
  settings,
  webhookEndpoint,
  orgId,
}: {
  settings: IntegrationSettings | null;
  webhookEndpoint: string;
  orgId: string;
}) {
  const [state, formAction] = useActionState(saveIntegrationSettings, {});
  const [copied, setCopied] = useState<string | null>(null);

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
                Dry-run mode
              </span>
              <span className="mt-0.5 block text-sm text-muted-foreground">
                Simulate calls, WhatsApp/SMS and emails without contacting providers.
                Recommended until your keys are configured.
              </span>
            </span>
            <Switch
              name="dryRun"
              value="true"
              defaultChecked={settings?.dry_run ?? true}
              aria-label="Dry-run mode"
            />
          </label>
        </CardContent>
      </Card>

      {/* Lead webhook */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Lead intake webhook</CardTitle>
          <CardDescription>
            Point 36 Acre, MagicBricks, your website forms, Zapier or Make at this endpoint.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Endpoint</Label>
            <div className="flex gap-2">
              <Input readOnly value={webhookEndpoint} className="h-10 text-xs" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-10 shrink-0"
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
                className="absolute right-2 top-2 size-8"
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
              <SelectTrigger id="int-assign" className="h-11 w-full">
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
          <CardTitle className="text-base">Twilio Voice & SMS/WhatsApp</CardTitle>
          <CardDescription>
            Powers the instant agent-to-lead call bridge and outbound messages. Environment
            variables are used as fallback when these are blank.
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
          <div className="space-y-1.5">
            <Label htmlFor="tw-token">Auth token</Label>
            <Input
              id="tw-token"
              name="twilioAuthToken"
              type="password"
              defaultValue={settings?.twilio_auth_token ?? ""}
              className="h-11 font-mono text-xs"
              autoComplete="off"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tw-phone">Voice/SMS number</Label>
              <Input
                id="tw-phone"
                name="twilioPhoneNumber"
                defaultValue={settings?.twilio_phone_number ?? ""}
                className="h-11"
                placeholder="+14155551234"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tw-wa">WhatsApp sender</Label>
              <Input
                id="tw-wa"
                name="whatsappSender"
                defaultValue={settings?.whatsapp_sender ?? ""}
                className="h-11"
                placeholder="whatsapp:+14155238886"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email + AI + Social */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Email, AI & social hand-off</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="int-resend">Resend API key</Label>
            <Input
              id="int-resend"
              name="resendApiKey"
              type="password"
              defaultValue={settings?.resend_api_key ?? ""}
              className="h-11 font-mono text-xs"
              autoComplete="off"
              placeholder="re_..."
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="int-openai">OpenAI-compatible API key</Label>
              <Input
                id="int-openai"
                name="openaiApiKey"
                type="password"
                defaultValue={settings?.openai_api_key ?? ""}
                className="h-11 font-mono text-xs"
                autoComplete="off"
                placeholder="sk-..."
              />
            </div>
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
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="int-social">Social publishing webhook (Zapier/Make/Buffer)</Label>
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
        <p role="alert" className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {state.error}
        </p>
      )}

      <SubmitButton>Save integration settings</SubmitButton>
    </form>
  );
}
