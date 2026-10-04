import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cookie-backed Supabase client for Server Components, Server Actions and Route
 * Handlers (the current `@supabase/ssr` pattern — not the legacy auth helpers).
 *
 * It uses the publishable key and carries the admin's session, so it can only do
 * what that authenticated user is allowed to do. Catalogue writes and Storage
 * uploads that need privilege go through the separate server-only secret-key
 * client in `src/lib/supabase/admin.ts`.
 */
export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. " +
        "Admin authentication needs the project URL and its publishable (anon) key.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // session refresh is handled by src/proxy.ts instead.
        }
      },
    },
  });
}
