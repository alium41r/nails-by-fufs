import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isAdminUser } from "@/config/admin";

/**
 * Proxy (Next 16's renamed middleware) — refreshes the Supabase Auth session on
 * every /admin request and turns away non-admins, so an unauthenticated request
 * never even reaches an admin page.
 *
 * This is a convenience gate, not the authorisation boundary: every admin page
 * and Server Action re-checks the allowlist server-side in
 * `src/lib/admin/auth.ts`, because a proxy must not be the only defence.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const { pathname } = request.nextUrl;
  const isLoginRoute = pathname === "/admin/login";

  // Without configuration the login page explains the setup step; sending the
  // visitor there beats a 500 from a client that cannot be constructed.
  if (!url || !publishableKey) {
    return isLoginRoute
      ? NextResponse.next({ request })
      : NextResponse.redirect(new URL("/admin/login?error=not_configured", request.url));
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Touching getUser() is what refreshes an expiring session cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isLoginRoute && !isAdminUser(user)) {
    const redirectUrl = new URL("/admin/login", request.url);
    if (user) redirectUrl.searchParams.set("error", "not_admin");
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
