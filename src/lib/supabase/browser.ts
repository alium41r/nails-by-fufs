import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client (publishable key only).
 *
 * Used for the admin sign-in form so the session cookie is set by Supabase Auth
 * in the browser. The publishable/anon key is a public key by design; the
 * privileged `SUPABASE_SECRET_KEY` is never used here or anywhere client-side.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. " +
        "Admin sign-in needs the project URL and its publishable (anon) key.",
    );
  }

  return createBrowserClient(url, publishableKey);
}
