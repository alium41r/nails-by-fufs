/**
 * Records revalidation calls instead of touching a Next.js cache.
 *
 * The integration tests run the production actions against the live database, so
 * every `next/cache` function the app imports has to exist here. A missing export
 * fails the whole suite at import time — which is how this file earns its keep:
 * when `getStorefrontCatalogue` gained a cross-request cache and the catalogue
 * actions gained tag invalidation, `unstable_cache` and `updateTag` had to be
 * added here as well.
 *
 * Path, tag and update calls are recorded separately so that
 * `revalidatedPaths()` keeps returning exactly the path strings it always has,
 * and the newer tag-based invalidation can be asserted through
 * `revalidatedTags()` / `revalidatedUpdates()` without disturbing it.
 */

const paths: string[] = [];
const tags: string[] = [];
const updates: string[] = [];

export function revalidatePath(path: string) {
  paths.push(path);
}

export function revalidateTag(tag: string) {
  tags.push(tag);
}

/**
 * The catalogue write paths call this to expire the cached catalogue, so it is
 * recorded separately from `revalidateTag`: the studio and admin tests can then
 * assert that a write actually invalidated the catalogue, rather than only that
 * some cache call happened.
 */
export function updateTag(tag: string) {
  updates.push(tag);
}

/**
 * A pass-through cache.
 *
 * The integration tests assert on what the catalogue read *returns*, so caching
 * here would serve one test's snapshot to the next and could hide a broken query.
 * The callable is returned unwrapped, so the real database read still runs on
 * every invocation and only the caching layer is bypassed.
 *
 * The real signature is `unstable_cache(fn, keyParts?, options?)`; the extra
 * arguments are accepted and ignored so the two cannot drift.
 */
export function unstable_cache<T extends (...args: never[]) => Promise<unknown>>(
  fn: T,
  _keyParts?: string[],
  _options?: { tags?: string[]; revalidate?: number | false },
): T {
  return fn;
}

export function clearRevalidated() {
  paths.length = 0;
  tags.length = 0;
  updates.length = 0;
}

export function revalidatedPaths() {
  return [...paths];
}

export function revalidatedTags() {
  return [...tags];
}

export function revalidatedUpdates() {
  return [...updates];
}
