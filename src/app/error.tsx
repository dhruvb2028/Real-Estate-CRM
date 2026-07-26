"use client";

import { useEffect } from "react";
import { AlertTriangle, LifeBuoy, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { brand } from "@/lib/brand";

/**
 * Branded error screen. Staff should never see a raw framework crash page, and
 * they should always have a next step: retry, or contact support.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="size-7" aria-hidden />
      </div>
      <h1 className="font-display mt-5 text-2xl font-semibold tracking-tight">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        This screen failed to load. Your data is safe — please try again.
      </p>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button onClick={reset} className="h-11 px-5">
          <RotateCcw className="size-4" aria-hidden /> Try again
        </Button>
        <Button variant="outline" className="h-11 px-5" render={<a href="/dashboard" />}>
          Back to dashboard
        </Button>
      </div>

      {(brand.supportEmail || brand.supportPhone) && (
        <p className="mt-6 flex flex-wrap items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <LifeBuoy className="size-3.5" aria-hidden />
          Still stuck? Contact
          {brand.supportEmail && (
            <a href={`mailto:${brand.supportEmail}`} className="font-medium text-primary">
              {brand.supportEmail}
            </a>
          )}
          {brand.supportPhone && (
            <a href={`tel:${brand.supportPhone}`} className="font-medium text-primary">
              {brand.supportPhone}
            </a>
          )}
        </p>
      )}

      {error.digest && (
        <p className="mt-3 font-mono text-[11px] text-muted-foreground/70">
          Reference: {error.digest}
        </p>
      )}
    </div>
  );
}
