import "dotenv/config";

/**
 * The exact cookie name @supabase/ssr derives for this project, read from the
 * SDK rather than hard-coded, so the E2E harness breaks loudly if it changes.
 */
async function deriveCookieName(): Promise<string> {
  const { createServerClient } = await import("@supabase/ssr");
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => undefined } },
  );
  return (client.auth as unknown as { storageKey: string }).storageKey;
}

export const AUTH_COOKIE_NAME = await deriveCookieName();

/** Wraps a minted session value as the cookie the app will read. */
export function authCookie(value: string) {
  return { name: AUTH_COOKIE_NAME, value };
}
