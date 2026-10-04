/**
 * Request stand-in for the live integration suites.
 *
 * The actions under test read `headers()` from next/headers to derive a rate-limit
 * caller key, so the integration run supplies the headers a real request would
 * carry. Everything else — authorisation, validation, Prisma, Storage — is the
 * production code path.
 */
let current = new Headers();

export function setRequestHeaders(headers: Record<string, string>) {
  current = new Headers(headers);
}

/**
 * The cookie jar the app's Supabase server client reads.
 *
 * Kept in the same stub because both are request-scoped: a real request carries
 * cookies and headers together, and the actions under test consult both.
 */
type Cookie = { name: string; value: string };
let jar: Cookie[] = [];

export function setCookieJar(cookies: Cookie[]) {
  jar = cookies;
}

export async function headers() {
  return current;
}

export async function cookies() {
  return {
    getAll: () => jar,
    get: (name: string) => jar.find((cookie) => cookie.name === name),
    set: () => undefined,
    delete: () => undefined,
    has: (name: string) => jar.some((cookie) => cookie.name === name),
  };
}
