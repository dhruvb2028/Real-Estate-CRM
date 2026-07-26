import { describe, expect, it, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";
import { isValidTwilioSignature } from "@/lib/security/twilio-signature";
import { rateLimit } from "@/lib/security/rate-limit";

/**
 * These guard the two public attack surfaces on a client deployment: the Twilio
 * callbacks and the lead intake webhook.
 */
describe("isValidTwilioSignature", () => {
  const authToken = "test_auth_token_12345";
  const url = "https://client.example.com/api/twilio/status?callId=abc&leg=agent";
  const params = { CallStatus: "completed", CallSid: "CA123", CallDuration: "42" };

  function sign(u: string, p: Record<string, string>, token = authToken) {
    const data = Object.keys(p)
      .sort()
      .reduce((acc, k) => acc + k + p[k], u);
    return crypto.createHmac("sha1", token).update(Buffer.from(data, "utf-8")).digest("base64");
  }

  it("accepts a correctly signed request", () => {
    expect(
      isValidTwilioSignature({ authToken, signature: sign(url, params), url, params })
    ).toBe(true);
  });

  it("rejects a forged signature", () => {
    expect(
      isValidTwilioSignature({ authToken, signature: "obviously-wrong", url, params })
    ).toBe(false);
  });

  it("rejects a signature made with a different auth token", () => {
    const forged = sign(url, params, "someone_elses_token");
    expect(isValidTwilioSignature({ authToken, signature: forged, url, params })).toBe(false);
  });

  it("rejects when params are tampered with after signing", () => {
    const sig = sign(url, params);
    const tampered = { ...params, CallDuration: "9999" };
    expect(
      isValidTwilioSignature({ authToken, signature: sig, url, params: tampered })
    ).toBe(false);
  });

  it("rejects when the URL differs from the signed one", () => {
    const sig = sign(url, params);
    const otherUrl = "https://client.example.com/api/twilio/status?callId=DIFFERENT&leg=agent";
    expect(
      isValidTwilioSignature({ authToken, signature: sig, url: otherUrl, params })
    ).toBe(false);
  });

  it("rejects a missing signature header", () => {
    expect(isValidTwilioSignature({ authToken, signature: null, url, params })).toBe(false);
  });

  it("rejects when no auth token is configured (fails closed)", () => {
    expect(
      isValidTwilioSignature({ authToken: "", signature: sign(url, params), url, params })
    ).toBe(false);
  });
});

describe("rateLimit", () => {
  it("allows requests up to the limit, then blocks", () => {
    const key = `test-${crypto.randomUUID()}`;
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key, { limit: 5, windowMs: 60_000 }).ok).toBe(true);
    }
    const blocked = rateLimit(key, { limit: 5, windowMs: 60_000 });
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks each caller independently", () => {
    const a = `a-${crypto.randomUUID()}`;
    const b = `b-${crypto.randomUUID()}`;
    rateLimit(a, { limit: 1, windowMs: 60_000 });
    expect(rateLimit(a, { limit: 1, windowMs: 60_000 }).ok).toBe(false);
    // A different IP must not be affected by the first one's usage.
    expect(rateLimit(b, { limit: 1, windowMs: 60_000 }).ok).toBe(true);
  });

  it("resets after the window elapses", async () => {
    const key = `w-${crypto.randomUUID()}`;
    expect(rateLimit(key, { limit: 1, windowMs: 50 }).ok).toBe(true);
    expect(rateLimit(key, { limit: 1, windowMs: 50 }).ok).toBe(false);
    await new Promise((r) => setTimeout(r, 70));
    expect(rateLimit(key, { limit: 1, windowMs: 50 }).ok).toBe(true);
  });
});

describe("secret encryption", () => {
  const KEY = crypto.randomBytes(32).toString("base64");
  let original: string | undefined;

  beforeEach(() => {
    original = process.env.SECRETS_ENCRYPTION_KEY;
    process.env.SECRETS_ENCRYPTION_KEY = KEY;
  });
  afterEach(() => {
    if (original === undefined) delete process.env.SECRETS_ENCRYPTION_KEY;
    else process.env.SECRETS_ENCRYPTION_KEY = original;
  });

  it("round-trips a Twilio auth token", async () => {
    const { encryptSecret, decryptSecret, isEncrypted } = await import(
      "@/lib/security/crypto"
    );
    const plain = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4";
    const enc = encryptSecret(plain)!;
    expect(enc).not.toContain(plain);
    expect(isEncrypted(enc)).toBe(true);
    expect(decryptSecret(enc)).toBe(plain);
  });

  it("produces a different ciphertext each time (random IV)", async () => {
    const { encryptSecret } = await import("@/lib/security/crypto");
    expect(encryptSecret("same-value")).not.toBe(encryptSecret("same-value"));
  });

  it("passes through legacy plaintext values so upgrades don't break", async () => {
    const { decryptSecret } = await import("@/lib/security/crypto");
    expect(decryptSecret("legacy_plaintext_token")).toBe("legacy_plaintext_token");
  });

  it("returns null for null/empty input", async () => {
    const { encryptSecret, decryptSecret } = await import("@/lib/security/crypto");
    expect(encryptSecret(null)).toBeNull();
    expect(decryptSecret(null)).toBeNull();
  });
});
