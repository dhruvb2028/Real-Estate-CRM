/**
 * White-label brand configuration.
 *
 * Every client deployment sets these environment variables; no code changes are
 * needed per client. Values are read at build/render time and are safe to use in
 * both server and client components (all are NEXT_PUBLIC_*).
 *
 * Required per deployment:
 *   NEXT_PUBLIC_BRAND_NAME        e.g. "Skyline Realty CRM"
 *   NEXT_PUBLIC_BRAND_SHORT_NAME  e.g. "Skyline"      (PWA / tight spaces)
 *
 * Optional:
 *   NEXT_PUBLIC_BRAND_TAGLINE     shown on the sign-in panel
 *   NEXT_PUBLIC_BRAND_LOGO_URL    replaces the built-in mark
 *   NEXT_PUBLIC_BRAND_PRIMARY     hex/oklch accent, overrides the gold theme
 *   NEXT_PUBLIC_BRAND_SUPPORT_EMAIL / _PHONE  shown on error screens
 *   NEXT_PUBLIC_BRAND_WEBSITE
 */

function env(key: string, fallback: string): string {
  const value = process.env[key];
  return value && value.trim() ? value.trim() : fallback;
}

export const brand = {
  /** Full product name — page titles, headings, emails. */
  name: env("NEXT_PUBLIC_BRAND_NAME", "EstateFlow CRM"),
  /** Compact name — PWA short_name, nav, tight layouts. */
  shortName: env("NEXT_PUBLIC_BRAND_SHORT_NAME", "EstateFlow"),
  /** One-line positioning statement on the sign-in screen. */
  tagline: env("NEXT_PUBLIC_BRAND_TAGLINE", "Close more deals, faster."),
  description: env(
    "NEXT_PUBLIC_BRAND_DESCRIPTION",
    "Mobile-first real estate CRM — instant lead calling, one-click property sharing, follow-ups, inventory, attendance and social planning."
  ),
  /** Optional hosted logo. When empty the built-in mark is used. */
  logoUrl: env("NEXT_PUBLIC_BRAND_LOGO_URL", ""),
  /** Optional brand accent. When empty the default estate-gold theme applies. */
  primaryColor: env("NEXT_PUBLIC_BRAND_PRIMARY", ""),
  supportEmail: env("NEXT_PUBLIC_BRAND_SUPPORT_EMAIL", ""),
  supportPhone: env("NEXT_PUBLIC_BRAND_SUPPORT_PHONE", ""),
  website: env("NEXT_PUBLIC_BRAND_WEBSITE", ""),
} as const;

/**
 * Splits the brand name for the two-tone wordmark (first word plain, rest
 * accented). "Skyline Realty CRM" → { lead: "Skyline", accent: "Realty CRM" }
 */
export function splitBrandName(full: string = brand.name): {
  lead: string;
  accent: string;
} {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) {
    // Single word: split roughly in half so the accent still reads as designed.
    const mid = Math.ceil(parts[0].length / 2);
    return { lead: parts[0].slice(0, mid), accent: parts[0].slice(mid) };
  }
  return { lead: parts[0], accent: parts.slice(1).join(" ") };
}
