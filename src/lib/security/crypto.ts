import "server-only";
import crypto from "node:crypto";

/**
 * Envelope encryption for integration secrets stored in Postgres.
 *
 * Even though `integration_settings` is admin-only behind RLS, a database dump,
 * a leaked service-role key, or a support engineer with read access should never
 * expose a client's Twilio auth token. Values are encrypted with AES-256-GCM
 * using SECRETS_ENCRYPTION_KEY (32 bytes, base64) held only in the deployment's
 * environment.
 *
 * Ciphertext format: v1:<iv-b64>:<tag-b64>:<ciphertext-b64>
 */
const PREFIX = "v1";

function getKey(): Buffer | null {
  const raw = process.env.SECRETS_ENCRYPTION_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      "SECRETS_ENCRYPTION_KEY must be 32 bytes base64-encoded. Generate with: openssl rand -base64 32"
    );
  }
  return key;
}

export function isEncrypted(value: string | null | undefined): boolean {
  return !!value && value.startsWith(`${PREFIX}:`);
}

/**
 * Encrypts a secret. When no key is configured the value is stored as-is so a
 * deployment without the key still works (with a startup warning) rather than
 * silently losing the client's settings.
 */
export function encryptSecret(plain: string | null | undefined): string | null {
  if (!plain) return null;
  const key = getKey();
  if (!key) return plain;
  if (isEncrypted(plain)) return plain;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    PREFIX,
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

/** Decrypts a stored secret; passes through legacy plaintext values. */
export function decryptSecret(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (!isEncrypted(stored)) return stored;

  const key = getKey();
  if (!key) {
    console.error(
      "[crypto] Encrypted secret found but SECRETS_ENCRYPTION_KEY is not set — integration disabled."
    );
    return null;
  }

  try {
    const [, ivB64, tagB64, dataB64] = stored.split(":");
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(ivB64, "base64")
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    console.error("[crypto] Failed to decrypt secret — wrong key or corrupt value.");
    return null;
  }
}

/** Renders a masked hint for the UI, e.g. "••••••••4f2a". Never the real value. */
export function maskSecret(plain: string | null | undefined): string {
  if (!plain) return "";
  const tail = plain.slice(-4);
  return `••••••••${tail}`;
}
