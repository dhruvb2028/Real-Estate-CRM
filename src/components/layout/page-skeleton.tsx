import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shared loading shell. Mirrors the real page rhythm (header, then a grid or
 * list of cards) so navigation feels instant instead of blank.
 */
export function PageSkeleton({
  variant = "list",
  rows = 6,
}: {
  variant?: "list" | "grid" | "detail" | "hero";
  rows?: number;
}) {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      {variant === "hero" ? (
        <Skeleton className="h-52 rounded-3xl" />
      ) : (
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded-lg" />
        </div>
      )}

      {variant === "detail" ? (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : (
        <div
          className={
            variant === "grid"
              ? "grid grid-cols-2 gap-3 lg:grid-cols-4"
              : "grid gap-3 md:grid-cols-2"
          }
        >
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton
              key={i}
              className={variant === "grid" ? "h-32 rounded-2xl" : "h-36 rounded-2xl"}
            />
          ))}
        </div>
      )}
    </div>
  );
}
