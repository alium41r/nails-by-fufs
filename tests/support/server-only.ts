/**
 * Test stand-in for the `server-only` marker package.
 *
 * The real package throws unless it is resolved with the `react-server`
 * condition, which is how Next.js keeps server modules out of a client bundle.
 * Vitest resolves the default condition, so the marker is aliased to this empty
 * module (the same thing `server-only/empty.js` does under `react-server`).
 *
 * This does not weaken anything: no client bundle is built from a test run, and
 * the marker still applies to `next build`.
 */
export {};
