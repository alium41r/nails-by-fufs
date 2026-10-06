import type { SiteContent } from "@/lib/site-content-schema";
import { CONTENT_KEYS, POLICY_SLUGS, policyKey } from "@/lib/site-content-schema";

/**
 * Maps a `site_content` key to its document inside a loaded `SiteContent` tree.
 *
 * Free of `server-only` so the Studio panel (a client component) can call it: the
 * panel already holds the whole tree from the admin-only management projection,
 * and this is only the reverse of the mapping `parseSiteContent` performs.
 *
 * Returns `undefined` for a key that is not part of the tree, which the panel
 * treats as "not loaded" rather than rendering an editor over nothing.
 */
export function readContentValue(content: SiteContent, key: string): unknown {
  const map: Record<string, unknown> = {
    [CONTENT_KEYS.identity]: content.identity,
    [CONTENT_KEYS.contact]: content.contact,
    [CONTENT_KEYS.socials]: content.socials,
    [CONTENT_KEYS.announcement]: content.announcement,
    [CONTENT_KEYS.navMain]: content.nav.main,
    [CONTENT_KEYS.navMobile]: content.nav.mobile,
    [CONTENT_KEYS.navFooter]: content.nav.footer,
    [CONTENT_KEYS.newsletter]: content.newsletter,
    [CONTENT_KEYS.hero]: content.home.hero,
    [CONTENT_KEYS.featuredCollection]: content.home.featuredCollection,
    [CONTENT_KEYS.productPreview]: content.home.productPreview,
    [CONTENT_KEYS.customFeature]: content.home.customFeature,
    [CONTENT_KEYS.howItWorks]: content.home.howItWorks,
    [CONTENT_KEYS.gallery]: content.home.gallery,
    [CONTENT_KEYS.finalCta]: content.home.finalCta,
    [CONTENT_KEYS.homeNewsletter]: content.home.newsletter,
    [CONTENT_KEYS.faq]: content.faq,
  };
  if (key in map) return map[key];

  for (const slug of POLICY_SLUGS) {
    if (key === policyKey(slug)) return content.policies[slug];
  }
  return undefined;
}
