"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  inviteAcceptSchema,
  loginSchema,
  signupSchema,
} from "@/lib/validations";
import type { ActionState } from "@/lib/types";

export async function login(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, error: "Invalid email or password" };

  const next = (formData.get("next") as string) || "/dashboard";
  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function signup(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    organizationName: formData.get("organizationName"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
        organization_name: parsed.data.organizationName,
      },
    },
  });
  if (error) return { ok: false, error: error.message };

  // If email confirmation is enabled, there's no session yet.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return {
      ok: true,
      message: "Account created. Check your email to confirm, then sign in.",
    };
  }
  redirect("/dashboard");
}

export async function acceptInvite(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = inviteAcceptSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    token: formData.get("token"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  // Validate the invite and get the invited email
  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("team_members")
    .select("email, status, expires_at")
    .eq("token", parsed.data.token)
    .maybeSingle();

  if (!invite || invite.status !== "pending" || new Date(invite.expires_at) < new Date()) {
    return { ok: false, error: "This invite is invalid or has expired." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: invite.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
        invite_token: parsed.data.token,
      },
    },
  });
  if (error) return { ok: false, error: error.message };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return {
      ok: true,
      message: "Account created. Check your email to confirm, then sign in.",
    };
  }
  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
