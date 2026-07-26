import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Compass className="size-7" aria-hidden />
      </div>
      <h1 className="font-display mt-5 text-2xl font-semibold tracking-tight">
        Page not found
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        This page doesn&apos;t exist, or the record was removed.
      </p>
      <Button className="mt-6 h-11 px-5" render={<Link href="/dashboard" />}>
        Back to dashboard
      </Button>
    </div>
  );
}
