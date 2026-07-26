import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create workspace" };

/**
 * Public signup is disabled on client deployments — the admin account is created
 * during provisioning and the rest of the team joins by invite. Middleware also
 * blocks this route; this check is defence in depth.
 */
export default function SignupPage() {
  if (process.env.NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP !== "true") {
    redirect("/login");
  }
  return <SignupForm />;
}
