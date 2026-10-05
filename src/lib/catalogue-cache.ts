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
 * The cache tag covering every owner-managed content read.
 *
 * A second tag rather than one shared tag, because the two change independently
 * and at different rates: editing the hero heading should not expire the
 * catalogue, and adding a product should not expire the policy pages. Each
 * surface invalidates only its own tag, and both are cheap to recompute.
 */
export const CONTENT_CACHE_TAG = "storefront-content";

/** Backstop staleness bound for content, matching the catalogue's reasoning. */
export const CONTENT_CACHE_SECONDS = 60;

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

/**
 * Every path that renders owner-managed content.
 *
 * Wider than `CATALOGUE_PATHS` because site-wide content — the announcement bar,
 * the header and mobile navigation, the footer's social links — renders inside
 * `<Shell>` on every storefront route, not just the ones that show products.
 * The policy and FAQ pages are listed by name because they have no dynamic
 * segment. `/cart` and `/checkout` are included deliberately: they render the
 * shell too, so a stale announcement bar there is exactly the kind of drift this
 * function exists to prevent.
 *
 * `/admin` is included so the Control Center reflects an edit made in Studio
 * Mode (or another tab) without a manual reload.
 */
const CONTENT_PATHS = [
  "/",
  "/shop",
  "/collections",
  "/search",
  "/custom",
  "/about",
  "/contact",
  "/faq",
  "/how-it-works",
  "/size-guide",
  "/book-appointment",
  "/cart",
  "/checkout",
  "/privacy-policy",
  "/returns-refunds",
  "/shipping-policy",
  "/terms",
  "/product/[slug]",
  "/collections/[slug]",
  "/admin",
] as const;

/**
 * Invalidates the cached content documents and every route that renders them.
 *
 * Separate from `invalidateCatalogue()` so a content edit does not needlessly
 * expire the catalogue, and vice versa. Safe to call for a write that changed
 * nothing.
 */
export function invalidateSiteContent(): void {
  updateTag(CONTENT_CACHE_TAG);

  for (const path of CONTENT_PATHS) {
    revalidatePath(path);
  }
}

/*
 * ## Scope of the invalidation, and one thing it deliberately does not cover
 *
 * `updateTag` expires the cache of the process that handles the write. In
 * production that is the whole story, because the admin's edit arrives as a
 * Server Action and runs inside the same instance that serves the storefront —
 * which is the read-your-own-write property the integration suite asserts
 * (`tests/integration/content.e2e.test.ts`).
 *
 * It is NOT enough when something writes to `site_content` from *outside* the
 * running server — a direct SQL statement, or a test process against the same
 * database. The live server has no way to learn about that write and will keep
 * serving its cached copy until the `revalidate` backstop expires. That is
 * expected rather than a bug, and it is why the E2E suites write through the
 * real actions and why the regression check restarts the server before comparing
 * renders.
 *
 * The same is true of the catalogue tag above, for the same reason.
 */
