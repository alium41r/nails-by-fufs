import "server-only";

import { revalidatePath, updateTag } from "next/cache";

/**
 * Cache tag and invalidation for the public storefront catalogue.
 *
 * ## Why a separate module
 *
 * `getStorefrontCatalogue()` is cached across requests, so its result has to be
 * explicitly invalidated whenever the catalogue changes. Before this file
 * existed, the two write surfaces did not agree: the admin form actions called
 * `revalidatePath` themselves, and the catalogue actions called a local
 * `revalidateCatalogue()` helper — but **five image-mutating Studio actions
 * (`finalizeStudioImageUpload`, `reorderStudioImages`, `setStudioPrimaryImage`,
 * `updateStudioImageAlt`, `deleteStudioImage`) revalidated nothing at all**, and
 * no admin action revalidated `/`, `/collections` or `/search`.
 *
 * That was survivable only because every storefront route was
 * `force-dynamic` with `no-store`, so nothing was ever stale. The moment a
 * cross-request cache is introduced it becomes a correctness bug, so
 * invalidation is centralised here and every mutation path calls
 * `invalidateCatalogue()`.
 *
 * ## Read-your-own-writes
 *
 * `updateTag` (rather than `revalidateTag`) is deliberate. It is the Next.js
 * API for Server Actions that must show the caller their own change
 * immediately: it expires the tagged data so the *next* request waits for fresh
 * data instead of being served the stale copy. `revalidateTag` with a profile
 * would instead serve stale content while revalidating in the background, so an
 * admin would save a product and then be shown the old values — the exact
 * failure this module exists to prevent.
 *
 * `updateTag` expires the cached *data*. `revalidatePath` is kept alongside it
 * because it clears the other two layers: the prerendered route output, and —
 * importantly for the owner — the **client router cache**. Without the path
 * calls an admin who saves a product and then clicks to the storefront could
 * still be served the client-cached copy of the page they just changed. The
 * background revalidation that a tag alone would trigger is not acceptable
 * there.
 */

/** The single cache tag covering every public catalogue read. */
export const CATALOGUE_CACHE_TAG = "storefront-catalogue";

/**
 * Backstop lifetime for the cached catalogue, in seconds.
 *
 * Invalidation is event-driven, so this is not the primary freshness mechanism:
 * it is the ceiling on how stale a catalogue can be if some future write path
 * forgets to invalidate, plus the bound on cross-instance staleness. On a
 * serverless platform each instance holds its own cache, and `updateTag` can
 * only expire the instance that handled the write, so other instances converge
 * within this window rather than instantly.
 *
 * 60s is deliberately short. The catalogue is small and read-mostly, so a low
 * ceiling costs little and keeps the worst case tight. A longer window is safe
 * to adopt once writes are known to flow through `invalidateCatalogue()`.
 */
export const CATALOGUE_CACHE_SECONDS = 60;

/**
 * Every storefront path a catalogue change can appear on.
 *
 * The dynamic patterns (`/product/[slug]`, `/collections/[slug]`) are
 * deliberately used in their literal segment form rather than a concrete slug.
 * `revalidatePath` accepts the pattern and clears every prerendered instance of
 * that route, which means no caller has to know or look up the affected product
 * or collection slug — so a rename, a deactivation or a reorder cannot be
 * invalidated against the wrong URL by mistake.
 */
const CATALOGUE_PATHS = [
  "/",
  "/shop",
  "/collections",
  "/search",
  "/product/[slug]",
  "/collections/[slug]",
] as const;

/**
 * Invalidates the cached catalogue and every route that renders it.
 *
 * Call from a Server Action after a successful catalogue write. Safe to call
 * for a write that changed nothing: invalidation is idempotent.
 */
export function invalidateCatalogue(): void {
  updateTag(CATALOGUE_CACHE_TAG);

  for (const path of CATALOGUE_PATHS) {
    revalidatePath(path);
  }
}
