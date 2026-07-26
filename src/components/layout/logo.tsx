import { brand, splitBrandName } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * Brand mark. Uses NEXT_PUBLIC_BRAND_LOGO_URL when the client supplies their own
 * logo, otherwise renders the built-in estate mark with the brand wordmark.
 */
export function Logo({
  className,
  iconOnly = false,
  onDark = false,
}: {
  className?: string;
  iconOnly?: boolean;
  onDark?: boolean;
}) {
  const { lead, accent } = splitBrandName();

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {brand.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={brand.logoUrl}
          alt={brand.name}
          className="size-9 shrink-0 rounded-xl object-contain"
        />
      ) : (
        <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.8_0.13_90)] via-gold to-[oklch(0.58_0.13_80)] shadow-[0_2px_10px_-2px_oklch(0.686_0.135_85/50%)]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="oklch(0.2 0.02 60)"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-5"
            aria-hidden
          >
            <path d="M3 21h18" />
            <path d="M5 21V7l7-4 7 4v14" />
            <path d="M9 21v-6h6v6" />
          </svg>
        </div>
      )}
      {!iconOnly && (
        <span
          className={cn(
            "font-display text-xl font-semibold tracking-tight",
            onDark ? "text-white" : "text-foreground"
          )}
        >
          {lead}
          {accent && <span className="text-gold-gradient"> {accent}</span>}
        </span>
      )}
    </div>
  );
}
