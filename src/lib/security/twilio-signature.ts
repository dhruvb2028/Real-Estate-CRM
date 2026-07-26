import "server-only";
import crypto from "node:crypto";

/**
 * Validates Twilio's X-Twilio-Signature header.
 *
 * Twilio signs each webhook with your account auth token. Without this check
 * anyone on the internet could POST to /api/twilio/* and forge call records or
 * drive the TwiML flow. See:
 * https://www.twilio.com/docs/usage/security#validating-requests
 *
 * The signature is HMAC-SHA1 of (full URL + sorted POST params) keyed by the
 * auth token, base64-encoded.
 */
export function isValidTwilioSignature({
  authToken,
  signature,
  url,
  params,
}: {
  authToken: string;
  signature: string | null;
  /** The exact public URL Twilio requested, including query string. */
  url: string;
  /** POST body params (empty object for GET). */
  params: Record<string, string>;
}): boolean {
  if (!signature || !authToken) return false;

  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);

  const expected = crypto
    .createHmac("sha1", authToken)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Rebuilds the public URL Twilio used to reach us. Twilio signs the URL it
 * called, which behind Vercel's proxy is the forwarded host — not the internal
 * one Next.js sees.
 */
export function publicRequestUrl(request: Request, appUrl: string): string {
  const requested = new URL(request.url);
  const base = new URL(appUrl);
  requested.protocol = base.protocol;
  requested.host = base.host;
  requested.port = base.port;
  return requested.toString();
}
