"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/server/actions/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/layout/submit-button";
import { AlertCircle } from "lucide-react";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(login, {});

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>Sign in to your workspace</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {next && <input type="hidden" name="next" value={next} />}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@company.com"
              required
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
              className="h-11"
            />
          </div>

          {state.error && (
            <p
              role="alert"
              className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <AlertCircle className="size-4 shrink-0" aria-hidden />
              {state.error}
            </p>
          )}
          {state.message && (
            <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
              {state.message}
            </p>
          )}

          <SubmitButton>Sign in</SubmitButton>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/signup" className="-my-3 inline-block px-1 py-3 font-semibold text-primary hover:underline">
            Create your workspace
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
