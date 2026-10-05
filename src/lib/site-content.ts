import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";

import { CONTENT_CACHE_TAG, CONTENT_CACHE_SECONDS } from "@/lib/catalogue-cache";
import { getPrisma } from "@/lib/prisma/db";
import {
  CONTENT_KEYS,
  POLICY_SLUGS,
  parsePolicy,
  parseSiteContent,
  policyKey,
  resolvePolicyTokens,
  type SiteContent,
  type SiteIdentity,
  type SiteContact,
  type PolicyPageContent,
} from "@/lib/site-content-schema";

/**
 * The read/write boundary for owner-managed storefront content.
 *
 * ## Two layers of caching, for the same reasons as the catalogue
 *
 * `unstable_cache` gives cross-request reuse under the `storefront-content` tag,
 * so a navigation does not re-query five rows of JSON. React's `cache` gives
 * per-request deduplication, because one render legitimately asks for the
 * content more than once: the page body, `generateMetadata`, and `<Shell>` (for
 * the announcement bar, header nav and footer) all read it.
 *
 * Invalidation is event-driven through `invalidateSiteContent()` in
 * `@/lib/catalogue-cache`, which every content write calls. The `revalidate`
 * window below is only a backstop.
 *
 * ## Failure behaviour
 *
 * If the table is missing (a deploy ahead of the migration) or the read fails,
 * this returns `DEFAULT_SITE_CONTENT` — the exact content the storefront shipped
 * with as hardcoded TypeScript. The site therefore renders correctly before,
 * during and after the migration, and a content outage can never be a blank
 * page. That is also why the defaults are duplicated in code rather than only in
 * SQL.
 */

const readContentRows = unstable_cache(
  async (): Promise<{ key: string; value: unknown }[]> => {
    const prisma = getPrisma();
    const rows = await prisma.site_content.findMany({
      select: { key: true, value: true },
    });
    return rows.map((row) => ({ key: row.key, value: row.value }));
  },
  [CONTENT_CACHE_TAG],
  { tags: [CONTENT_CACHE_TAG], revalidate: CONTENT_CACHE_SECONDS },
);

/**
 * Reads every editable document, typed and with defaults applied.
 *
 * Wrapped in a catch as well as a cache: `unstable_cache` propagates a rejection
 * to every caller, and a storefront page must not 500 because the content table
 * could not be reached.
 */
export const getSiteContent = cache(async (): Promise<SiteContent> => {
  try {
    return parseSiteContent(await readContentRows());
  } catch (error) {
    console.error("[site-content] read failed; falling back to code defaults:", error);
    // `parseSiteContent([])` is the defaults tree — built through the same
    // parsers so the fallback cannot drift from the real read path.
    return parseSiteContent([]);
  }
});

/* -------------------------------------------------------------------------- */
/* Narrow readers                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Identity, contact and currency in one call.
 *
 * Split out because these three are needed by surfaces that render no storefront
 * content at all — `generateMetadata`, the policy pages' business block, the
 * checkout summary's currency — and reading the whole tree for a brand name
 * makes those call sites read as if they depend on more than they do.
 */
export const getSiteBasics = cache(
  async (): Promise<{ identity: SiteIdentity; contact: SiteContact; defaultCurrency: string }> => {
    const content = await getSiteContent();
    return {
      identity: content.identity,
      contact: content.contact,
      defaultCurrency: content.currency.default,
    };
  },
);

/**
 * One policy page, with {{tokens}} resolved against the current contact details.
 *
 * Returns the code default for an unknown slug rather than throwing, so a bad
 * link renders the shipped policy instead of a 404 — the failure mode a customer
 * would actually notice.
 */
export const getPolicyPage = cache(async (slug: string): Promise<PolicyPageContent> => {
  const content = await getSiteContent();
  const policy = content.policies[slug];

  if (!policy) {
    // Fall through to the parser's default for this slug (or privacy-policy when
    // the slug is not a policy at all), resolved against live contact details.
    return resolvePolicyTokens(parsePolicy(undefined, slug), content.contact);
  }

  return resolvePolicyTokens(policy, content.contact);
});

/* -------------------------------------------------------------------------- */
/* Public asset URLs                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Public URL for an object in the `site-assets` bucket.
 *
 * Mirrors `publicImageUrl` in `@/lib/catalogue` (which covers the
 * `product-images` bucket). Returns null when the path is empty or the Supabase
 * URL is not configured, which makes the component fall back to its placeholder
 * frame rather than rendering a broken `<img>`.
 */
export function siteAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/site-assets/${path}`;
}

/* -------------------------------------------------------------------------- */
/* Writing                                                                     */
/* -------------------------------------------------------------------------- */

export interface ContentWriteResult {
  ok: boolean;
  error?: string;
}

/**
 * Upserts one content document.
 *
 * Authorisation is NOT checked here: this function is called by
 * `src/app/admin/content-actions.ts`, which is a `"use server"` module whose
 * every export calls `getAdminUser()` first. Keeping the check at the action
 * boundary means there is exactly one place per surface where authorisation is
 * decided, and `server-only` on this module is what stops the function being
 * reachable from a browser bundle at all.
 *
 * `value` is the already-validated document. The caller is responsible for
 * passing a shape the parsers accept; the read path re-parses defensively
 * regardless, so a mistake here degrades to defaults rather than breaking a
 * render.
 */
export async function writeContentDocument(key: string, value: unknown): Promise<ContentWriteResult> {
  try {
    const prisma = getPrisma();
    await prisma.site_content.upsert({
      where: { key },
      create: { key, value_type: "jsonb", value: value as never },
      update: { value: value as never },
    });
    return { ok: true };
  } catch (error) {
    console.error(`[site-content] write failed for ${key}:`, error);
    return { ok: false, error: "That could not be saved. Nothing was changed — please try again." };
  }
}

/**
 * Deletes one content document, restoring the code default.
 *
 * This is the "reset to default" operation. It is deliberately a row delete and
 * not a flag: the defaults live in code, so removing the override IS restoring
 * the shipped value, and there is no second copy to drift.
 */
export async function resetContentDocument(key: string): Promise<ContentWriteResult> {
  try {
    const prisma = getPrisma();
    await prisma.site_content.deleteMany({ where: { key } });
    return { ok: true };
  } catch (error) {
    console.error(`[site-content] reset failed for ${key}:`, error);
    return { ok: false, error: "That could not be reset. Please try again." };
  }
}

/** The keys that may be written, so an action cannot write an arbitrary row. */
export const WRITABLE_CONTENT_KEYS: readonly string[] = [
  CONTENT_KEYS.identity,
  CONTENT_KEYS.contact,
  CONTENT_KEYS.socials,
  CONTENT_KEYS.announcement,
  CONTENT_KEYS.currency,
  CONTENT_KEYS.navMain,
  CONTENT_KEYS.navMobile,
  CONTENT_KEYS.navFooter,
  CONTENT_KEYS.newsletter,
  CONTENT_KEYS.hero,
  CONTENT_KEYS.featuredCollection,
  CONTENT_KEYS.productPreview,
  CONTENT_KEYS.customFeature,
  CONTENT_KEYS.howItWorks,
  CONTENT_KEYS.gallery,
  CONTENT_KEYS.finalCta,
  CONTENT_KEYS.homeNewsletter,
  CONTENT_KEYS.faq,
  ...POLICY_SLUGS.map(policyKey),
];

export function isWritableContentKey(key: string): boolean {
  return WRITABLE_CONTENT_KEYS.includes(key);
}
