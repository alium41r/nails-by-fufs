import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  CONTENT_KEYS,
  DEFAULT_ANNOUNCEMENT,
  DEFAULT_CONTACT,
  DEFAULT_GALLERY,
  DEFAULT_IDENTITY,
  DEFAULT_MAIN_NAV,
  DEFAULT_POLICIES,
  DEFAULT_SITE_CONTENT,
  POLICY_SLUGS,
  isValidLinkHref,
  parseAnnouncement,
  parseContact,
  parseCurrency,
  parseGallery,
  parseIdentity,
  parsePolicy,
  parseProductPreview,
  parseSiteContent,
  resolvePolicyTokens,
  resolveTokens,
  tokenValues,
} from "@/lib/site-content-schema";
import {
  CURRENCIES,
  FALLBACK_CURRENCY,
  currenciesForPicker,
  formatPrice,
  isPriced,
  majorUnitsHint,
  normalizeCurrency,
  pricePlaceholder,
} from "@/lib/currency";
import { PUBLIC_PRODUCT_FILTER, PUBLIC_COLLECTION_FILTER, toProductView, type ProductRow } from "@/lib/catalogue";
import { isSiteAssetPath, siteAssetPrefix, isContentKey } from "@/lib/admin/paths";

/**
 * Unit coverage for the owner-managed content layer.
 *
 * The theme running through all of it: a malformed or missing document must
 * degrade to the wording the site shipped with, never to an empty page or a
 * crash. That is the property the defensive parsers exist for, so it is what
 * most of these assert.
 */

describe("site content parsers", () => {
  it("falls back to the shipped values for every document when nothing is stored", () => {
    const content = parseSiteContent([]);

    expect(content.identity).toEqual(DEFAULT_IDENTITY);
    expect(content.contact).toEqual(DEFAULT_CONTACT);
    expect(content.announcement).toEqual(DEFAULT_ANNOUNCEMENT);
    expect(content.nav.main).toEqual(DEFAULT_MAIN_NAV);
    expect(content.home.gallery.items).toEqual(DEFAULT_GALLERY.items);
    expect(Object.keys(content.policies).sort()).toEqual([...POLICY_SLUGS].sort());
  });

  it("preserves the exact headline join the storefront renders", () => {
    // The hero renders `${headline} ${headlineAccent}`, so the literal space is
    // load-bearing: without it the page reads "Press-ons,made personal."
    const hero = DEFAULT_SITE_CONTENT.home.hero;
    expect(`${hero.headline} ${hero.headlineAccent}`).toBe("Press-ons, made personal.");
  });

  it("keeps the migration seed and the code defaults in step for the policy pages", () => {
    // Both copies exist on purpose (the seed for a fresh database, the defaults
    // for a deploy that runs before the migration), so drift between them would
    // mean two different "original" wordings.
    for (const slug of POLICY_SLUGS) {
      const parsed = parsePolicy(undefined, slug);
      expect(parsed.sections.length).toBe(DEFAULT_POLICIES[slug].sections.length);
      expect(parsed.title).toBe(DEFAULT_POLICIES[slug].title);
      expect(parsed.lastUpdated).toBe(DEFAULT_POLICIES[slug].lastUpdated);
    }
  });

  it("keeps every policy section's optional shape (bullets-only stays bullets-only)", () => {
    const privacy = parsePolicy(undefined, "privacy-policy");
    const bulletsOnly = privacy.sections.find((section) => section.id === "what-we-do-not-collect");
    expect(bulletsOnly?.bullets?.length).toBeGreaterThan(0);
    // The renderer uses `?.` on both, so an absent key and an empty array must
    // stay distinguishable.
    expect(bulletsOnly?.paragraphs).toBeUndefined();
  });

  it("coerces a wrong-typed field instead of failing the whole document", () => {
    const parsed = parseIdentity({
      name: 42,
      shortName: null,
      description: { nested: true },
      tagline: "Custom",
    });

    expect(parsed.name).toBe(DEFAULT_IDENTITY.name);
    expect(parsed.shortName).toBe(DEFAULT_IDENTITY.shortName);
    expect(parsed.description).toBe(DEFAULT_IDENTITY.description);
    expect(parsed.tagline).toBe("Custom");
  });

  it("drops unknown keys rather than storing them", () => {
    const parsed = parseProductPreview({ title: "Mine", futureField: "should not survive" });
    expect(parsed.title).toBe("Mine");
    expect(Object.keys(parsed)).not.toContain("futureField");
  });

  it("clamps the product preview limit to something renderable", () => {
    expect(parseProductPreview({ productLimit: 0 }).productLimit).toBe(1);
    expect(parseProductPreview({ productLimit: 10000 }).productLimit).toBe(24);
    expect(parseProductPreview({ productLimit: "lots" }).productLimit).toBe(4);
  });

  it("drops a gallery tile that would render as an empty frame", () => {
    const parsed = parseGallery({
      items: [
        { key: "a", label: "Real tile" },
        { key: "b", label: "", imagePath: null },
        { key: "c", imagePath: "site/home/gallery/x.webp" },
      ],
    });

    expect(parsed.items.map((item) => item.key)).toEqual(["a", "c"]);
  });

  it("keeps gallery keys unique so React cannot collide", () => {
    const parsed = parseGallery({
      items: [
        { key: "dup", label: "One" },
        { key: "dup", label: "Two" },
      ],
    });
    expect(new Set(parsed.items.map((item) => item.key)).size).toBe(parsed.items.length);
  });

  it("preserves an address list that has been deliberately emptied", () => {
    // Removing the published address is a valid edit, so it must not be treated
    // as a missing value and replaced by the default.
    expect(parseContact({ addressLines: [] }).addressLines).toEqual([]);
    // ...but a wrong type still falls back.
    expect(parseContact({ addressLines: "nowhere" }).addressLines).toEqual(
      DEFAULT_CONTACT.addressLines,
    );
  });
});

describe("link validation", () => {
  it("accepts the schemes the storefront actually uses", () => {
    for (const href of ["/shop", "/collections/spring-edit", "https://instagram.com/x", "mailto:a@b.com", "tel:+923081364285"]) {
      expect(isValidLinkHref(href), href).toBe(true);
    }
  });

  it("rejects script injection and origin escapes", () => {
    for (const href of ["javascript:alert(1)", "//evil.example.com", "data:text/html,<script>", ""]) {
      expect(isValidLinkHref(href), href).toBe(false);
    }
  });

  it("keeps the admin surface out of owner-managed navigation", () => {
    expect(isValidLinkHref("/admin")).toBe(false);
    expect(isValidLinkHref("/admin/content")).toBe(false);
    expect(isValidLinkHref("/design-system")).toBe(false);
  });

  it("falls back rather than rendering an unsafe stored CTA target", () => {
    const parsed = parseSiteContent([
      { key: CONTENT_KEYS.hero, value: { primaryCta: { label: "Free nails", href: "javascript:alert(1)" } } },
    ]);
    expect(parsed.home.hero.primaryCta.href).toBe(DEFAULT_SITE_CONTENT.home.hero.primaryCta.href);
    // The label is the owner's, only the unsafe destination is refused.
    expect(parsed.home.hero.primaryCta.label).toBe("Free nails");
  });

  it("allows clearing the announcement link so the banner becomes plain text", () => {
    expect(parseAnnouncement({ href: "" }).href).toBe("");
  });
});

describe("policy tokens", () => {
  it("resolves the tokens the migration stored", () => {
    const values = tokenValues(DEFAULT_CONTACT);
    expect(resolveTokens("Email {{email}} or {{phone}}", values)).toBe(
      `Email ${DEFAULT_CONTACT.email} or ${DEFAULT_CONTACT.phone}`,
    );
  });

  it("leaves an unknown token visible instead of deleting it", () => {
    const values = tokenValues(DEFAULT_CONTACT);
    expect(resolveTokens("Hello {{nope}}", values)).toBe("Hello {{nope}}");
  });

  it("updates every mention when a contact detail changes", () => {
    const moved = { ...DEFAULT_CONTACT, email: "new@studio.test", phone: "999" };
    const resolved = resolvePolicyTokens(parsePolicy(undefined, "privacy-policy"), moved);

    const text = resolved.sections
      .flatMap((section) => [...(section.paragraphs ?? []), ...(section.bullets ?? [])])
      .join(" ");

    expect(text).toContain("new@studio.test");
    expect(text).not.toContain(DEFAULT_CONTACT.email);
    expect(text).not.toContain("{{email}}");
  });
});

describe("currency", () => {
  it("offers PKR", () => {
    expect(CURRENCIES.some((currency) => currency.code === "PKR")).toBe(true);
  });

  it("validates a code the way the database CHECK does", () => {
    expect(normalizeCurrency("pkr")).toBe("PKR");
    expect(normalizeCurrency("usdd")).toBeNull();
    expect(normalizeCurrency("")).toBeNull();
    expect(normalizeCurrency(null)).toBeNull();
  });

  it("labels the no-price placeholder with the configured currency's symbol", () => {
    // Byte-identical to the literal "$XX" the storefront rendered before the
    // migration, for the currency it was already using.
    expect(pricePlaceholder("USD")).toBe("$XX");
    expect(pricePlaceholder("PKR")).toBe("RsXX");
    expect(pricePlaceholder(null)).toBe(`${CURRENCIES.find((c) => c.code === FALLBACK_CURRENCY)!.symbol}XX`);
  });

  it("never converts a stored price, whatever the store's default is", () => {
    // The default currency must not touch an existing price. A product priced in
    // USD keeps rendering as USD even when the store default becomes PKR.
    expect(formatPrice(4500, "USD")).toBe("USD 45.00");
    expect(formatPrice(4500, "PKR")).toBe("PKR 45.00");
    expect(formatPrice(null, null)).toBe("$XX");
  });

  it("treats a price without a currency as not a price", () => {
    expect(isPriced(1000, "USD")).toBe(true);
    expect(isPriced(1000, null)).toBe(false);
    expect(isPriced(null, "USD")).toBe(false);
  });

  it("puts the configured default first in the picker", () => {
    expect(currenciesForPicker("PKR")[0].code).toBe("PKR");
    expect(currenciesForPicker("USD")[0].code).toBe("USD");
    // A stored code outside the list stays selectable rather than being silently
    // rewritten.
    expect(currenciesForPicker("JPY")[0].code).toBe("JPY");
  });

  it("explains minor units per currency", () => {
    expect(majorUnitsHint("PKR")).toContain("PKR");
    expect(majorUnitsHint("USD")).toContain("45.00");
  });

  it("parses a stored default and refuses junk", () => {
    expect(parseCurrency({ default: "pkr" }).default).toBe("PKR");
    expect(parseCurrency({ default: "nonsense" }).default).toBe("USD");
    expect(parseCurrency(undefined).default).toBe("USD");
  });
});

describe("public catalogue visibility", () => {
  it("excludes archived rows from every public read", () => {
    // Archiving has no RLS policy — the privileged connection bypasses RLS — so
    // these filters are the only thing hiding a retired row.
    expect(PUBLIC_COLLECTION_FILTER.archived_at).toBeNull();
    expect(PUBLIC_PRODUCT_FILTER.archived_at).toBeNull();
    expect(PUBLIC_PRODUCT_FILTER.collections).toEqual({
      is: { is_active: true, archived_at: null },
    });
  });

  it("does not publish a product whose collection is missing", () => {
    // `collection_id` is nullable now, and a product with no collection must not
    // leak onto the storefront through the relation filter.
    const filter = PUBLIC_PRODUCT_FILTER.collections as { is: { is_active: boolean } };
    expect(filter.is.is_active).toBe(true);
  });
});

describe("product view mapping", () => {
  const row: ProductRow = {
    id: "p1",
    slug: "glazed-truffle",
    name: "Glazed Truffle",
    descriptor: "Almond",
    description: "A glaze.",
    shape: "Almond",
    default_length: "Medium",
    finish: "Soft Gloss",
    tag: null,
    included: [],
    price_minor: null,
    currency: null,
    collections: null,
  };

  it("renders a product with no collection instead of crashing", () => {
    const view = toProductView(row, []);
    expect(view.collectionSlug).toBe("");
    expect(view.collectionName).toBe("");
  });

  it("uses the store currency only for the placeholder", () => {
    expect(toProductView(row, [], "PKR").price).toBe("RsXX");
    expect(toProductView({ ...row, price_minor: 1000, currency: "USD" }, [], "PKR").price).toBe(
      "USD 10.00",
    );
  });
});

describe("site asset paths", () => {
  it("scopes an object to the content key that owns it", () => {
    const path = `${siteAssetPrefix("home.hero")}6f1c8a2e-1111-2222-3333-444455556666.webp`;
    expect(isSiteAssetPath(path, "home.hero")).toBe(true);
    // Another document's folder is not reachable from this key.
    expect(isSiteAssetPath(path, "home.gallery")).toBe(false);
    expect(isSiteAssetPath(path, "site.identity")).toBe(false);
  });

  it("rejects traversal, nesting and absolute paths", () => {
    expect(isSiteAssetPath("site/home/hero/../secret.png", "home.hero")).toBe(false);
    expect(isSiteAssetPath("/site/home/hero/x.png", "home.hero")).toBe(false);
    expect(isSiteAssetPath("site/home/hero/nested/x.png", "home.hero")).toBe(false);
    expect(isSiteAssetPath("site/home/hero/x.svg", "home.hero")).toBe(false);
  });

  it("accepts exactly the key shapes the table's CHECK allows", () => {
    expect(isContentKey("home.hero")).toBe(true);
    expect(isContentKey("page.policy.privacy-policy")).toBe(true);
    expect(isContentKey("site.nav.main")).toBe(true);
    expect(isContentKey("Home.Hero")).toBe(false);
    expect(isContentKey("home..hero")).toBe(false);
  });
});

describe("single source of truth for published business details", () => {
  /**
   * `/contact` and the appointment pages published the studio's email, phone and
   * address from `@/config/business` while the policy pages published them from
   * `site.contact`. Editing a detail in the admin therefore updated the policy
   * pages and left the contact page advertising the old one — two sources of
   * truth for the same fact, disagreeing silently.
   *
   * This is a static scan rather than a render assertion because the failure mode
   * is a *new import*: someone reaching for a convenient constant restores the
   * divergence without any test going red. `businessDetails` still exists for the
   * pages that legitimately build their own copy from constants; what this
   * forbids is a page that publishes contact details from it.
   */
  const PUBLISHING_SURFACES = [
    "src/app/contact/page.tsx",
    "src/app/book-appointment/page.tsx",
    "src/components/appointment/AppointmentForm.tsx",
    "src/components/legal/LegalPage.tsx",
    "src/app/privacy-policy/page.tsx",
    "src/app/returns-refunds/page.tsx",
    "src/app/shipping-policy/page.tsx",
    "src/app/terms/page.tsx",
  ];

  it("reads every published business detail from the content layer", () => {
    for (const relative of PUBLISHING_SURFACES) {
      const source = readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
      expect(source, `${relative} must not publish details from @/config/business`).not.toMatch(
        /from "@\/config\/business"/,
      );
    }
  });

  it("keeps the content layer as the only reader of the contact settings", () => {
    // The reverse direction: the storefront must go through `getSiteContent`
    // (which applies defaults and parses) rather than reading the table directly.
    const sources = [
      "src/app/contact/page.tsx",
      "src/app/book-appointment/page.tsx",
      "src/components/legal/LegalPage.tsx",
    ];
    for (const relative of sources) {
      const source = readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
      expect(source, `${relative} must read content through @/lib/site-content`).toMatch(
        /getSiteContent|getPolicyPage/,
      );
    }
  });
});
