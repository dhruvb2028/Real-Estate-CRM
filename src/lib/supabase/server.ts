import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Profile } from "@/lib/types";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — middleware refreshes sessions.
          }
        },
      },
    }
  );
}

/**
 * Current auth user + profile, memoized per request.
 * Returns null when unauthenticated.
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  // Local JWT validation (JWKS) — avoids an auth-server round trip per render.
  // Treat an unreachable auth server as "signed out" rather than crashing the
  // render; callers redirect to sign-in, which surfaces a readable message.
  let userId: string | undefined;
  try {
    const { data } = await supabase.auth.getClaims();
    userId = data?.claims?.sub;
  } catch {
    return null;
  }
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  return (profile as Profile) ?? null;
});

/**
 * Current profile, or a redirect to sign-in.
 *
 * This must redirect rather than throw. A thrown Error in a Server Component or
 * Server Action is caught by the nearest error boundary, so an ordinary expired
 * session would show the user a "something went wrong" crash screen instead of
 * the login page. Server Actions in particular never render the layout, so its
 * guard cannot cover them.
 */
export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  // redirect() signals via a special error Next.js handles — never catch it.
  if (!profile) redirect("/login");
  if (!profile.organization_id) redirect("/login");
  return profile;
}
