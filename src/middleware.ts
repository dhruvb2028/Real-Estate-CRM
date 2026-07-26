import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Single-tenant deployments ship with public signup OFF: the admin account is
 * created during provisioning and everyone else joins by invite. Set
 * NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP=true only for a shared/demo instance.
 */
const ALLOW_PUBLIC_SIGNUP = process.env.NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP === "true";

const PUBLIC_PATHS = [
  "/login",
  "/invite",
  "/p/",
  "/api/webhooks",
  "/api/twilio",
  ...(ALLOW_PUBLIC_SIGNUP ? ["/signup"] : []),
];

function isPublic(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Validate the session locally (JWKS-verified JWT — no auth-server round
  // trip). Expired tokens still refresh automatically.
  //
  // If auth is unreachable this must not take the whole app down: fall back to
  // "unauthenticated", which sends people to the sign-in page where the error
  // is explained, instead of throwing a 500 on every route.
  let user: { id: string } | null = null;
  try {
    const { data } = await supabase.auth.getClaims();
    user = data?.claims ? { id: data.claims.sub } : null;
  } catch {
    user = null;
  }

  const { pathname } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Signed-out visitors never reach a disabled signup page.
  if (!ALLOW_PUBLIC_SIGNUP && pathname.startsWith("/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/signup" || pathname === "/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
