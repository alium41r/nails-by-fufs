/**
 * The typed schema for owner-managed storefront content.
 *
 * ## What this file is
 *
 * `site_content` stores one JSON document per key (see the migration
 * `20261005120100_site_content.sql`). This module is the only declaration of what
 * each of those documents must contain, the code default used when a row is
 * missing, and the parser that turns an untrusted `jsonb` value into a typed
 * object.
 *
 * ## Why the defaults live here and not in the database
 *
 * Every default below is the value the storefront shipped with as hardcoded
 * TypeScript, copied across verbatim by the migration. They are kept in code for
 * two reasons:
 *
 *   1. **The storefront must render before the migration is applied.** A deploy
 *      that reads content but finds no rows has to show the current site, not an
 *      empty one. `readDocument` falls back per document, so a partially
 *      populated database degrades field by field rather than page by page.
 *   2. **A malformed document must not take the storefront down.** If a write
 *      ever stored the wrong shape, the parser falls back to the default instead
 *      of throwing inside a page render.
 *
 * ## Why parsing is defensive
 *
 * `value` is `jsonb`, so nothing at the database level stops a document from
 * being an array where an object is expected, or a number where a string is. The
 * parsers below therefore *validate and coerce* rather than cast: unknown keys
 * are dropped, wrong-typed fields fall back individually, and arrays are rebuilt
 * element by element. A cast would let a bad row reach a component and render
 * `[object Object]` to a customer.
 *
 * Deliberately free of `server-only`, Prisma and React: the client-side Studio
 * editors need these types and the nav/CTA validators, and the unit tests need
 * to exercise the parsers without a database.
 */

import type { PlaceholderRatio } from "@/lib/catalogue";

/* -------------------------------------------------------------------------- */
/* Primitives                                                                  */
/* -------------------------------------------------------------------------- */

export interface CtaLink {
  label: string;
  href: string;
}

export interface NavItem {
  /**
   * Stable identity, independent of the label and href.
   *
   * The old config keyed nav items on `href` in React and on `title` in the
   * footer, which meant renaming or re-pointing an item remounted it and two
   * items could not share a destination. Every item now carries a key that the
   * editor never changes.
   */
  key: string;
  label: string;
  href: string;
  /** False hides the item without deleting it. */
  enabled: boolean;
}

export interface NavSection {
  key: string;
  title: string;
  items: NavItem[];
}

export interface SocialLink {
  key: string;
  label: string;
  href: string;
  enabled: boolean;
}

export interface GalleryItem {
  key: string;
  ratio: PlaceholderRatio;
  label: string;
  sublabel: string;
  alt: string;
  /** Storage object path in `site-assets`, or null for the placeholder frame. */
  imagePath: string | null;
}

export interface ImageSlot {
  imagePath: string | null;
  imageAlt: string;
  imagePlaceholderLabel: string;
  imagePlaceholderSublabel: string;
  imageRatio: PlaceholderRatio;
}

/* -------------------------------------------------------------------------- */
/* Documents                                                                   */
/* -------------------------------------------------------------------------- */

export interface SiteIdentity {
  name: string;
  shortName: string;
  description: string;
  /** Small line under the header wordmark, e.g. "Press-On Studio". */
  tagline: string;
  /**
   * The route-loading skeleton's version of the tagline.
   *
   * A separate field because the skeleton and the real header genuinely used
   * different wording before this migration, and the skeleton must keep the
   * shorter one: it renders before any content read resolves, so it always shows
   * this default, and changing it would alter the loading state on every route.
   */
  skeletonTagline: string;
  /**
   * The mobile drawer's descriptor.
   *
   * A third distinct wording, because the drawer carried "Bespoke Press-On Nail
   * Studio" while the footer carried "Press-On Nail Studio". Each is kept and each
   * is editable, rather than collapsing three surface-specific strings into one
   * and changing two of them.
   */
  mobileTagline: string;
  /**
   * The footer's own descriptor.
   *
   * A distinct field from `tagline` because the header and footer used different
   * wording before this migration ("Press-On Studio" beside the wordmark,
   * "Press-On Nail Studio" in the footer), and each is now independently
   * editable.
   */
  footerTagline: string;
  /** Site-wide metadata fallback, used by the root layout. */
  metaTitle: string;
  metaDescription: string;
  /**
   * The homepage's own title and description.
   *
   * Separate from the site-wide pair because the homepage carried a different
   * title from every other page ("... Handcrafted Press-On Nails & Custom Sets"),
   * and collapsing the two would have changed the homepage's search listing.
   */
  homeMetaTitle: string;
  homeMetaDescription: string;
}

export interface SiteContact {
  email: string;
  phone: string;
  addressLines: string[];
  country: string;
  jurisdiction: string;
}

export interface AnnouncementContent {
  enabled: boolean;
  text: string;
  href: string;
}

export interface NewsletterContent {
  heading: string;
  description: string;
  ctaLabel: string;
  emailSubject: string;
}

export interface HeroContent extends ImageSlot {
  eyebrow: string;
  headline: string;
  headlineAccent: string;
  description: string;
  primaryCta: CtaLink;
  secondaryCta: CtaLink;
}

export interface FeaturedCollectionContent extends ImageSlot {
  eyebrow: string;
  title: string;
  description: string;
  cta: CtaLink;
  /** The label revealed on hover over the lookbook visual. */
  hoverHintLabel: string;
}

export interface ProductPreviewContent {
  eyebrow: string;
  title: string;
  viewAllLabel: string;
  viewAllHref: string;
  /** Where each product tile links. */
  cardHref: string;
  /** How many products the preview shows. */
  productLimit: number;
}

export interface CustomFeatureContent extends ImageSlot {
  eyebrow: string;
  title: string;
  description: string;
  cta: CtaLink;
}

/**
 * One card in the homepage guide hub.
 *
 * This replaced a numbered process step. A step restated the process on the
 * homepage; a guide card sends the reader to the page that actually answers the
 * question — sizing, application, delivery, care — so the two cannot drift apart.
 * `description` is deliberately one short line, because the card is a signpost
 * rather than an explanation.
 *
 * There is no stored `number`: position is the array's, so reordering the cards
 * in the Studio renumbers them instead of leaving a stale "03" behind.
 */
export interface GuideCardContent {
  title: string;
  description: string;
  href: string;
}

export interface HowItWorksContent {
  eyebrow: string;
  title: string;
  description: string;
  cta: CtaLink;
  links: GuideCardContent[];
}

export interface GalleryContent {
  eyebrow: string;
  title: string;
  description: string;
  items: GalleryItem[];
}

export interface FinalCtaContent {
  eyebrow: string;
  title: string;
  description: string;
  primaryCta: CtaLink;
  secondaryCta: CtaLink;
}

export interface HomeNewsletterContent {
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  emailSubject: string;
}

export interface FaqItemContent {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export interface FaqCategoryContent {
  id: string;
  label: string;
}

export interface FaqPageContent {
  hero: { eyebrow: string; title: string; description: string };
  categories: FaqCategoryContent[];
  items: FaqItemContent[];
  cta: {
    eyebrow: string;
    title: string;
    description: string;
    primaryCta: CtaLink;
    secondaryCta: CtaLink;
  };
  /** The note under the accordion. */
  footerNote: string;
}

export interface LegalSectionContent {
  /**
   * Anchor id, used for `#id` deep links and the on-page index.
   *
   * Editable, because a heading rename should be able to produce a sensible
   * anchor — but the migration preserved the existing ids exactly so no
   * bookmarked or shared deep link breaks.
   */
  id: string;
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface PolicyPageContent {
  eyebrow: string;
  title: string;
  description: string;
  intro: string[];
  sections: LegalSectionContent[];
  metaTitle: string;
  metaDescription: string;
  /**
   * Human-readable date shown as "Last updated".
   *
   * A stored string rather than a derived `updated_at` because the published
   * date and the row's modification time are different facts: correcting a typo
   * should not tell customers the policy changed. The migration seeded the one
   * global date the four pages shared before.
   */
  lastUpdated: string;
}

/* -------------------------------------------------------------------------- */
/* The whole content tree                                                      */
/* -------------------------------------------------------------------------- */

export interface SiteContent {
  identity: SiteIdentity;
  contact: SiteContact;
  socials: SocialLink[];
  announcement: AnnouncementContent;
  nav: {
    main: NavItem[];
    mobile: NavItem[];
    footer: NavSection[];
  };
  newsletter: NewsletterContent;
  home: {
    hero: HeroContent;
    featuredCollection: FeaturedCollectionContent;
    productPreview: ProductPreviewContent;
    customFeature: CustomFeatureContent;
    howItWorks: HowItWorksContent;
    gallery: GalleryContent;
    finalCta: FinalCtaContent;
    newsletter: HomeNewsletterContent;
  };
  faq: FaqPageContent;
  policies: Record<string, PolicyPageContent>;
}

/* -------------------------------------------------------------------------- */
/* The content keys                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Every key the code renders. A row whose key is not in this list has no effect
 * on the storefront, which is what keeps this a content system rather than a
 * layout builder: there is no way to introduce a new section by adding a row.
 */
export const CONTENT_KEYS = {
  identity: "site.identity",
  contact: "site.contact",
  socials: "site.socials",
  announcement: "site.announcement",
  navMain: "site.nav.main",
  navMobile: "site.nav.mobile",
  navFooter: "site.nav.footer",
  newsletter: "site.newsletter",
  hero: "home.hero",
  featuredCollection: "home.featuredCollection",
  productPreview: "home.productPreview",
  customFeature: "home.customFeature",
  howItWorks: "home.howItWorks",
  gallery: "home.gallery",
  finalCta: "home.finalCta",
  homeNewsletter: "home.newsletter",
  faq: "page.faq",
} as const;

/** Policy page slugs, which are also their storefront routes. */
export const POLICY_SLUGS = [
  "privacy-policy",
  "returns-refunds",
  "shipping-policy",
  "terms",
] as const;

export type PolicySlug = (typeof POLICY_SLUGS)[number];

export function policyKey(slug: string): string {
  return `page.policy.${slug}`;
}

/* -------------------------------------------------------------------------- */
/* Defaults — the values the storefront shipped with, migrated verbatim         */
/* -------------------------------------------------------------------------- */

/**
 * The serviceable link schemes for owner-supplied hrefs.
 *
 * An `href` from the database reaching a `next/link` is an injection point: a
 * stored `javascript:…` would render as a working link that runs script in the
 * customer's session. `next/link` and React do not sanitise this, so it is
 * validated here and again on write.
 */
export const ALLOWED_LINK_PREFIXES = ["/", "https://", "http://", "mailto:", "tel:"] as const;

/**
 * Routes an owner may not point navigation at.
 *
 * `/admin*` is session-gated and `robots: noindex`; advertising it in the public
 * footer would also advertise the login form. `/design-system` is a developer
 * surface linked from nowhere. Neither is business content.
 */
export const BLOCKED_LINK_PATHS = ["/admin", "/design-system"] as const;

/**
 * Whether a stored href is safe and sensible to render.
 *
 * Relative paths must start with a single `/` (so `//evil.com`, which browsers
 * treat as protocol-relative and would leave the site, is rejected), absolute
 * URLs must be http(s), and `mailto:`/`tel:` are allowed because the studio's
 * only contact channels are exactly those.
 */
export function isValidLinkHref(value: string): boolean {
  const href = value.trim();
  if (href.length === 0) return false;
  // Protocol-relative: browsers resolve this to another origin.
  if (href.startsWith("//")) return false;

  if (href.startsWith("/")) {
    const path = href.split(/[?#]/)[0];
    return !BLOCKED_LINK_PATHS.some(
      (blocked) => path === blocked || path.startsWith(`${blocked}/`),
    );
  }

  if (href.startsWith("mailto:") || href.startsWith("tel:")) return true;

  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Groups a flat list into the ordered pairs the header and footer render. */
function cta(label: string, href: string): CtaLink {
  return { label, href };
}

export const DEFAULT_IDENTITY: SiteIdentity = {
  name: "Nails by Fufs",
  shortName: "Fufs",
  description: "Handcrafted, reusable press-on nails and custom nail artistry by Fufs.",
  tagline: "Press-On Studio",
  skeletonTagline: "Press-On Studio",
  footerTagline: "Press-On Nail Studio",
  mobileTagline: "Bespoke Press-On Nail Studio",
  metaTitle: "Nails by Fufs — Bespoke Press-On Nails & Nail Artistry",
  metaDescription:
    "Handcrafted, reusable press-on nails and custom nail artistry by Fufs, designed with intentional form, tactile textures, and refined aesthetic.",
  homeMetaTitle: "Nails by Fufs — Handcrafted Press-On Nails & Custom Sets",
  homeMetaDescription:
    "Independent press-on nail studio by Fufs. Browse seasonal sets or commission custom handcrafted nail designs.",
};

export const DEFAULT_CONTACT: SiteContact = {
  email: "sorry360.you@gmail.com",
  phone: "03081364285",
  addressLines: ["Sector M, DHA Phase 5, Lahore"],
  country: "Pakistan",
  jurisdiction: "Pakistan",
};

export const DEFAULT_ANNOUNCEMENT: AnnouncementContent = {
  enabled: true,
  text: "Complimentary bespoke sizing kit included with your first order",
  href: "/size-guide",
};

export const DEFAULT_NEWSLETTER: NewsletterContent = {
  heading: "Private Studio Releases",
  description: "Receive release updates for new collections and custom order openings.",
  ctaLabel: "Email to Subscribe",
  emailSubject: "Studio release updates",
};

export const DEFAULT_SOCIALS: SocialLink[] = [
  { key: "instagram", label: "Instagram", href: "https://instagram.com", enabled: true },
  { key: "tiktok", label: "TikTok", href: "https://tiktok.com", enabled: true },
  { key: "pinterest", label: "Pinterest", href: "https://pinterest.com", enabled: true },
];

export const DEFAULT_MAIN_NAV: NavItem[] = [
  { key: "shop", label: "Shop", href: "/shop", enabled: true },
  { key: "collections", label: "Collections", href: "/collections", enabled: true },
  { key: "custom", label: "Custom", href: "/custom", enabled: true },
  { key: "book-appointment", label: "Book Appointment", href: "/book-appointment", enabled: true },
  { key: "how-it-works", label: "How It Works", href: "/how-it-works", enabled: true },
  { key: "size-guide", label: "Size Guide", href: "/size-guide", enabled: true },
];

/**
 * The mobile drawer's list. It is a separate document rather than a reuse of the
 * desktop one because the drawer deliberately showed three more items (About,
 * FAQ, Contact) that do not fit the desktop bar — the two lists have different
 * jobs, and the old code expressed that by duplicating them, which meant editing
 * the config changed desktop only. Both are now owner-managed.
 */
export const DEFAULT_MOBILE_NAV: NavItem[] = [
  ...DEFAULT_MAIN_NAV,
  { key: "about", label: "About", href: "/about", enabled: true },
  { key: "faq", label: "FAQ", href: "/faq", enabled: true },
  { key: "contact", label: "Contact", href: "/contact", enabled: true },
];

export const DEFAULT_FOOTER_NAV: NavSection[] = [
  {
    key: "shop",
    title: "Shop",
    items: [
      { key: "all-press-ons", label: "All Press-Ons", href: "/shop", enabled: true },
      { key: "collections", label: "Collections", href: "/collections", enabled: true },
      { key: "custom-orders", label: "Custom Orders", href: "/custom", enabled: true },
      { key: "book-appointment", label: "Book Appointment", href: "/book-appointment", enabled: true },
    ],
  },
  {
    key: "care",
    title: "Care & Sizing",
    items: [
      { key: "how-it-works", label: "How It Works", href: "/how-it-works", enabled: true },
      { key: "size-guide", label: "Size Guide", href: "/size-guide", enabled: true },
    ],
  },
  {
    key: "information",
    title: "Information",
    items: [
      { key: "about", label: "About Fufs", href: "/about", enabled: true },
      { key: "faq", label: "FAQ", href: "/faq", enabled: true },
      { key: "contact", label: "Contact", href: "/contact", enabled: true },
    ],
  },
  {
    key: "policies",
    title: "Policies",
    items: [
      { key: "privacy", label: "Privacy Policy", href: "/privacy-policy", enabled: true },
      { key: "returns", label: "Returns & Refunds", href: "/returns-refunds", enabled: true },
      { key: "shipping", label: "Shipping & Service", href: "/shipping-policy", enabled: true },
      { key: "terms", label: "Terms & Conditions", href: "/terms", enabled: true },
    ],
  },
];

export const DEFAULT_HERO: HeroContent = {
  eyebrow: "Handmade Press-On Nails",
  headline: "Press-ons,",
  headlineAccent: "made personal.",
  description:
    "Created by independent nail artist Fufs. Thoughtfully designed sets for easy wear and your own personal style.",
  primaryCta: cta("Shop Nails", "/shop"),
  secondaryCta: cta("Custom Orders", "/custom"),
  imagePath: null,
  imageAlt: "Nails by Fufs hero set presentation",
  imagePlaceholderLabel: "Featured Hand Editorial",
  imagePlaceholderSublabel: "4:5 • HERO PHOTOGRAPHY",
  imageRatio: "portrait",
};

export const DEFAULT_FEATURED_COLLECTION: FeaturedCollectionContent = {
  eyebrow: "Featured Collection",
  title: "The Current Edit",
  description: "A small seasonal series of finishes, shapes, and palettes created by Fufs.",
  cta: cta("Explore Collection", "/collections"),
  hoverHintLabel: "View Lookbook",
  imagePath: null,
  imageAlt: "Featured collection editorial presentation",
  imagePlaceholderLabel: "Current Edit Lookbook",
  imagePlaceholderSublabel: "16:9 • COLLECTION VISUAL",
  imageRatio: "wide",
};

export const DEFAULT_PRODUCT_PREVIEW: ProductPreviewContent = {
  eyebrow: "Shop Preview",
  title: "Selected Sets",
  viewAllLabel: "View All Nails",
  viewAllHref: "/shop",
  cardHref: "/shop",
  productLimit: 4,
};

export const DEFAULT_CUSTOM_FEATURE: CustomFeatureContent = {
  eyebrow: "Bespoke Requests",
  title: "Made for your mood.",
  description:
    "Have a specific concept, colorway, or event in mind? Work directly with Fufs to create a set tailored to your preferences.",
  cta: cta("Request Custom Set", "/custom"),
  imagePath: null,
  imageAlt: "Custom commission nail design archive",
  imagePlaceholderLabel: "Custom Commission Archive",
  imagePlaceholderSublabel: "3:2 • BESPOKE ARCHIVE",
  imageRatio: "classic",
};

export const DEFAULT_HOW_IT_WORKS: HowItWorksContent = {
  eyebrow: "Guides & Support",
  title: "Guides",
  description: "Short, practical answers on sizing, application, delivery and care.",
  cta: cta("Application Guide", "/how-it-works"),
  links: [
    {
      title: "How It Works",
      description: "Follow a set from choosing a design to wearing it.",
      href: "/how-it-works",
    },
    {
      title: "Size Guide",
      description: "Measure your natural nails for a comfortable fit.",
      href: "/size-guide",
    },
    {
      title: "FAQ",
      description: "Sizing, fit, application, care and returns.",
      href: "/faq",
    },
    {
      title: "Book an Appointment",
      description: "Have your set applied in person at the studio.",
      href: "/book-appointment",
    },
    {
      title: "Shipping & Delivery",
      description: "Processing times and how orders are sent.",
      href: "/shipping-policy",
    },
    {
      title: "Contact the Studio",
      description: "Ask about a set, an order or a custom idea.",
      href: "/contact",
    },
  ],
};

export const DEFAULT_GALLERY: GalleryContent = {
  eyebrow: "Visual Archive",
  title: "Selected Looks",
  description: "A curated lookbook of finishes, textures, and custom pieces.",
  items: [
    {
      key: "gallery-1",
      ratio: "portrait",
      label: "Hand Lookbook 01",
      sublabel: "4:5 • CLOSE LOOK",
      alt: "Hand editorial nail look",
      imagePath: null,
    },
    {
      key: "gallery-2",
      ratio: "square",
      label: "Texture & Detail",
      sublabel: "1:1 • MACRO FOCUS",
      alt: "Nail finish and texture detail",
      imagePath: null,
    },
    {
      key: "gallery-3",
      ratio: "square",
      label: "Packaging & Care",
      sublabel: "1:1 • FLAT LAY",
      alt: "Set packaging and prep items",
      imagePath: null,
    },
    {
      key: "gallery-4",
      ratio: "portrait",
      label: "Hand Lookbook 02",
      sublabel: "4:5 • EDITORIAL",
      alt: "Alternative editorial nail angle",
      imagePath: null,
    },
  ],
};

export const DEFAULT_FINAL_CTA: FinalCtaContent = {
  eyebrow: "Nails by Fufs",
  title: "Ready for your next set?",
  description: "Explore available sets or reach out for custom work.",
  primaryCta: cta("Shop Nails", "/shop"),
  secondaryCta: cta("Custom Orders", "/custom"),
};

export const DEFAULT_HOME_NEWSLETTER: HomeNewsletterContent = {
  eyebrow: "Studio Updates",
  title: "Release Announcements",
  description: "Receive occasional updates when new sets or custom commission slots open.",
  ctaLabel: "Email to Join the Release List",
  emailSubject: "Studio release updates",
};
/**
 * The FAQ page as it shipped, used as the fallback for `page.faq`.
 */
export const DEFAULT_FAQ: FaqPageContent = {
  hero: {
    eyebrow: "Support & Answers",
    title: "Frequently Asked Questions",
    description: "Everything you need to know about our handcrafted press-on sets, sizing, bespoke commissions, and gentle nail care.",
  },
  categories: [
    {
      id: "all",
      label: "All Questions",
    },
    {
      id: "sets",
      label: "Sets & Orders",
    },
    {
      id: "sizing",
      label: "Sizing & Fit",
    },
    {
      id: "custom",
      label: "Custom Requests",
    },
    {
      id: "care",
      label: "Application & Care",
    },
  ],
  items: [
    {
      id: "faq-1",
      category: "sets",
      question: "What is included with each press-on set?",
      answer: "Every Nails by Fufs set comes with 10 custom-shaped nail tips, a complete prep kit (wooden cuticle stick, gentle mini buffer, prep wipes), and adhesive application materials (adhesive tabs and nail glue).",
    },
    {
      id: "faq-2",
      category: "sets",
      question: "Are these sets handmade or mass-produced?",
      answer: "Each set is individually painted, shaped, and top-coated by independent nail artist Fatima in small studio batches. We do not use generic factory-printed plastic tips.",
    },
    {
      id: "faq-3",
      category: "sizing",
      question: "How do I find my nail size?",
      answer: "You can measure the widest part of your natural nail bed using clear tape and a millimeter ruler as shown on our Size Guide page. We also offer standard XS, S, M, and L presets, or you can enter custom millimeter numbers for all 10 fingers.",
    },
    {
      id: "faq-4",
      category: "sizing",
      question: "What if my measurements don't match standard XS–L presets?",
      answer: "That is completely normal! Many clients have different widths across both hands. You can select 'Custom' on any product page or custom order request and provide your exact millimeter measurements at no extra charge.",
    },
    {
      id: "faq-5",
      category: "custom",
      question: "How do custom design commissions work?",
      answer: "On our Custom Orders page, you can share your design concept, preferred shape, length, color palette, and upload reference photos or moodboards. Fatima will review your vision and connect directly to confirm details before crafting your set.",
    },
    {
      id: "faq-6",
      category: "custom",
      question: "Can I commission nails for a wedding or special event?",
      answer: "Yes. Bespoke sets for weddings, formal events, and special photoshoots are welcome. We recommend submitting your custom request in advance with any event dates or outfit swatches you'd like to match.",
    },
    {
      id: "faq-7",
      category: "care",
      question: "How do I apply press-on nails for the best hold?",
      answer: "Gently push back cuticles, lightly buff the natural nail surface to remove shine, and wipe clean with the prep pad before applying adhesive tabs or glue. Press firmly for 15–20 seconds per nail.",
    },
    {
      id: "faq-8",
      category: "care",
      question: "How do I remove the nails without damaging my natural nails?",
      answer: "Soak your fingertips in warm soapy water (with a few drops of cuticle oil or baby oil if desired) for 10–15 minutes. The adhesive will soften and the nails will gently lift off without pulling or damage.",
    },
  ],
  cta: {
    eyebrow: "Have Another Question?",
    title: "Need something not answered here?",
    description: "Reach out directly through our contact page or custom order inquiry form. We're happy to help with sizing, design concepts, or care questions.",
    primaryCta: {
      label: "Contact Studio",
      href: "/contact",
    },
    secondaryCta: {
      label: "Custom Commission",
      href: "/custom",
    },
  },
  footerNote: "Each set is individually crafted. Don't hesitate to contact us if your question isn't covered above.",
};

/**
 * The four policy pages as they shipped, keyed by slug.
 *
 * These are the fallback for `page.policy.<slug>` and the migration seed
 * source. Business details appear as {{email}} / {{phone}} / {{address}} /
 * {{country}} / {{jurisdiction}} tokens, resolved at render time so that
 * changing the studio's email updates every page that mentions it.
 */
export const DEFAULT_POLICIES: Record<string, PolicyPageContent> = {
  "privacy-policy": {
    eyebrow: "Legal",
    title: "Privacy Policy",
    description: "What this website collects, why it is collected, and how it is kept.",
    intro: [
      "This policy covers this website only. It describes what the site actually does with your information, based on how the storefront and the custom order form are built today.",
    ],
    sections: [
      {
        id: "who-we-are",
        heading: "Who we are",
        paragraphs: [
          "Nails by Fufs is an independent press-on nail studio. Every set is individually painted, shaped and top-coated by artist Fatima in small studio batches — we do not use generic factory-printed plastic tips.",
          "This policy explains what happens to the information you share through this website. The studio's contact details are listed at the bottom of this page and on our contact page.",
        ],
      },
      {
        id: "what-you-send-us",
        heading: "What you can send us through this site",
        paragraphs: [
          "Different parts of the site collect different things. This is what each one asks for and what it is for:",
        ],
        bullets: [
          "Custom order requests (the custom order form): your name, email address, an optional Instagram handle or preferred contact; your design preferences — shape, length, sizing option (sizing kit, preset size XS–L, or your own millimetre measurements), optional colour notes, your design description, and optional event date, budget guidance and additional notes; and any reference images you choose to attach.",
          "Bag and checkout: the contents of your bag are stored in your own browser so the bag survives a page reload. At checkout you can enter contact details (name, email, phone) and delivery details (country, street address, optional second address line, city, optional region, optional postal code, optional delivery notes) so an order can be prepared.",
          "Direct contact: if you email or phone the studio using the details published on this site, the studio receives whatever you choose to send in that message so it can reply to you.",
          "Theme preference: whether you prefer the light or dark appearance of the site is stored in your browser only.",
        ],
      },
      {
        id: "what-we-do-not-collect",
        heading: "What this site does not collect",
        bullets: [
          "No customer accounts and no passwords — you can use the storefront and send a custom request without registering.",
          "No payment card details. Online payment is not enabled yet, so no card or banking information is requested or stored by this site.",
          "No third-party advertising or analytics trackers. The site does not embed advertising pixels or visitor-analytics scripts.",
        ],
      },
      {
        id: "how-we-use-it",
        heading: "How your information is used",
        paragraphs: [
          "Information you send is used only for the purpose you sent it for: reviewing and producing a custom commission, replying to your message, preparing and delivering an order, and keeping the records needed to do those things.",
          "The site runs on Vercel (hosting) and Supabase (database and file storage). These providers process data on the studio's behalf so the site can operate.",
        ],
      },
      {
        id: "where-it-is-stored",
        heading: "Where your information is kept",
        paragraphs: [
          "Custom order requests and the reference images attached to them are stored in the studio's Supabase project. Reference images are held in a private storage bucket: they are not publicly listed or downloadable, and they are only reachable by the studio through short-lived authorised links.",
          "The contents of your bag and your theme preference never leave your device unless you submit a form.",
          "The checkout step is not connected to the studio's systems yet, so delivery details entered there are not sent to us and no order is completed through that page.",
        ],
      },
      {
        id: "retention",
        heading: "How long we keep it",
        paragraphs: [
          "Custom order requests, the reference images attached to them and related order records are retained only for as long as is reasonably necessary to handle your request, produce your order, maintain business records, or meet legal requirements.",
        ],
      },
      {
        id: "your-requests",
        heading: "Your choices and requests",
        paragraphs: [
          "You may contact the studio at any time to request access to the information we hold about you, to request that it be corrected, or to request that it be deleted, where applicable. Email {{email}} or phone {{phone}}, and include the email address you wrote from so your request can be matched to you.",
        ],
      },
      {
        id: "changes",
        heading: "Changes to this policy",
        paragraphs: [
          "If this policy changes, the updated version will be published on this page with a new date at the top. Continuing to use the site after an update means the current version applies.",
        ],
      },
      {
        id: "questions",
        heading: "Questions about this policy",
        paragraphs: [
          "If anything here is unclear, contact the studio at {{email}} or {{phone}} and we will explain how your information is handled.",
        ],
      },
    ],
    metaTitle: "Privacy Policy — Nails by Fufs",
    metaDescription: "What the Nails by Fufs website collects, why it is collected, and how it is kept — including custom order requests, reference images and delivery details.",
    lastUpdated: "4 October 2026",
  },
  "returns-refunds": {
    eyebrow: "Legal",
    title: "Returns & Refunds",
    description: "How returns, refunds and cancellations work for handcrafted sets.",
    intro: [
      "This page sets out the studio's returns, refunds and cancellation terms. Because every set is handmade to the details confirmed with you, these terms are specific rather than general.",
    ],
    sections: [
      {
        id: "handcrafted",
        heading: "Every set is handcrafted",
        paragraphs: [
          "Nails by Fufs sets are not mass-produced. Each set is individually painted, shaped and top-coated by artist Fatima in small studio batches, which is why the studio asks for your shape, length and sizing before a set is made.",
        ],
      },
      {
        id: "sizing-support",
        heading: "Sizing support comes first",
        paragraphs: [
          "Most fit problems come from sizing, so the studio offers several ways to get it right before a set is made:",
        ],
        bullets: [
          "A complimentary bespoke sizing kit is included with your first order.",
          "You can choose standard XS, S, M or L presets, or enter your own millimetre measurements for all ten nails at no extra charge.",
          "The Size Guide and How It Works pages explain how to measure and how a set is made.",
        ],
      },
      {
        id: "change-of-mind",
        heading: "Change of mind",
        paragraphs: [
          "Returns and refunds are not offered for change of mind, or if you simply dislike a set once it arrives. Because each set is made individually to the details confirmed with you, please take a moment over the shape, length and sizing options before an order is placed.",
        ],
      },
      {
        id: "damaged",
        heading: "If your order arrives damaged",
        paragraphs: [
          "If a set arrives damaged, contact the studio with your order details and photographs of what arrived. You may request either a refund or a replacement for that order.",
          "Reach the studio at {{email}} or {{phone}}, or through the contact page.",
        ],
      },
      {
        id: "cancellations",
        heading: "Cancellations",
        paragraphs: [
          "Once an order is confirmed it cannot be cancelled. If something about your order needs to change, contact the studio as early as possible — but a confirmed order cannot be called off.",
        ],
      },
      {
        id: "raise-a-request",
        heading: "How to raise a return or refund question",
        paragraphs: [
          "Contact the studio with your name, the email address you ordered with, and a short description of the issue so it can be matched to your order quickly.",
        ],
        bullets: [
          "Email: {{email}}",
          "Phone: {{phone}}",
          "Studio: {{address}}",
        ],
      },
    ],
    metaTitle: "Returns & Refunds — Nails by Fufs",
    metaDescription: "The returns, refund and cancellation terms for handcrafted Nails by Fufs press-on sets, including what to do if an order arrives damaged.",
    lastUpdated: "4 October 2026",
  },
  "shipping-policy": {
    eyebrow: "Legal",
    title: "Shipping & Service Policy",
    description: "How sets are made, sized and delivered — and how to reach the studio about an order.",
    intro: [
      "This page covers the studio's service: how a set is made, how sizing is handled, how long processing takes and how orders are delivered.",
    ],
    sections: [
      {
        id: "handmade-to-order",
        heading: "Sets are handcrafted in small batches",
        paragraphs: [
          "Every Nails by Fufs set is individually painted, shaped and top-coated by artist Fatima in small studio batches rather than pulled from mass-produced stock. Each set is prepared for the shape, length and sizing you select before it is sent.",
        ],
      },
      {
        id: "what-is-included",
        heading: "What comes with a set",
        paragraphs: [
          "Each set includes ten custom-shaped nail tips, a complete prep kit (wooden cuticle stick, gentle mini buffer and prep wipes) and adhesive application materials (adhesive tabs and nail glue).",
        ],
      },
      {
        id: "sizing-service",
        heading: "Sizing service",
        bullets: [
          "A complimentary bespoke sizing kit is included with your first order.",
          "You can choose standard XS, S, M or L presets, or provide your own millimetre measurements for all ten nails at no extra charge.",
          "The Size Guide explains how to measure, and the How It Works page walks through the studio process.",
        ],
      },
      {
        id: "delivery",
        heading: "Delivery",
        paragraphs: [
          "We deliver to major cities across {{country}}.",
          "Delivery normally takes 3–5 days after your order has been processed.",
          "Orders are sent to the delivery address you provide, and the studio contacts you using the email address and phone number supplied with your order if anything needs clarifying.",
        ],
      },
      {
        id: "processing",
        heading: "Processing time",
        paragraphs: [
          "Custom orders require 4 days of processing time. Delivery time is additional to that processing period.",
        ],
      },
      {
        id: "custom-commissions",
        heading: "Custom commissions",
        paragraphs: [
          "Custom requests are submitted through the custom order form with your concept, preferred shape and length, colour notes and any reference images. Fatima reviews the request and contacts you directly to confirm details before the set is crafted.",
          "If you are commissioning a set for a wedding or a specific event, submit your request in advance — a custom order needs its 4 day processing period before it is sent.",
        ],
      },
      {
        id: "service-contact",
        heading: "Service contact",
        paragraphs: [
          "Questions about an order in progress can be raised at any time using the details below.",
        ],
        bullets: [
          "Email: {{email}}",
          "Phone: {{phone}}",
          "Studio: {{address}}",
        ],
      },
    ],
    metaTitle: "Shipping & Service Policy — Nails by Fufs",
    metaDescription: "How Nails by Fufs handcrafts, sizes and delivers press-on sets: delivery to major cities across {{country}} within 3–5 days after processing, and 4 days processing for custom orders.",
    lastUpdated: "4 October 2026",
  },
  "terms": {
    eyebrow: "Legal",
    title: "Terms & Conditions",
    description: "The terms that apply to using this site and commissioning a set from the studio.",
    intro: [
      "These terms describe how the Nails by Fufs website and studio service work.",
    ],
    sections: [
      {
        id: "about-these-terms",
        heading: "About these terms",
        paragraphs: [
          "These terms apply to this website and to requests and orders placed through it. They are written to describe how the storefront and the studio actually work today.",
          "If you do not agree with them, please do not use the site or submit a request.",
        ],
      },
      {
        id: "using-the-site",
        heading: "Using the site",
        paragraphs: [
          "The site shows the studio's catalogue, sizing guidance and custom commission information. You are welcome to browse, and to submit a custom request, for personal use.",
          "You agree not to misuse the site — for example by submitting false information, attempting to interfere with it, or copying its content for commercial use.",
        ],
      },
      {
        id: "orders-and-availability",
        heading: "Orders and availability",
        paragraphs: [
          "Sets shown on the site come from the studio's live catalogue. Designs are made in small batches, so what is shown can change as pieces are made and released.",
          "Online payment is not enabled on this site yet. The checkout page can collect your contact and delivery details, but it does not currently complete an order or send those details to the studio, and no payment is taken through the site.",
          "Until checkout is enabled, the way to order is the custom order form, where Fatima confirms the shape, length, sizing and design details with you directly. Once an order is confirmed it cannot be cancelled — see the Returns & Refunds page for the returns and refund terms.",
        ],
      },
      {
        id: "prices-and-payment",
        heading: "Prices and payment",
        paragraphs: [
          "Catalogue prices are not published on the site yet and online payment is not enabled, so nothing is charged through the storefront. Until payment is live, pricing and payment are agreed directly with the studio when your order is confirmed.",
        ],
      },
      {
        id: "custom-commissions",
        heading: "Custom commissions",
        paragraphs: [
          "A custom request is a starting point, not a confirmed order. The studio reviews your concept, shape, length, colour notes and reference images, then contacts you directly to confirm the design and sizing before anything is crafted.",
          "Custom orders require 4 days of processing time, and delivery time is additional to that. Once details are confirmed with you, a commission is made to that agreed description.",
        ],
      },
      {
        id: "your-information",
        heading: "Information you give us",
        paragraphs: [
          "Please make sure the details you give us are accurate. The measurements you provide are used to make your set, and the delivery address you provide is where it will be sent, so mistakes there affect the finished result.",
          "How your information is handled is described in the Privacy Policy.",
        ],
      },
      {
        id: "designs-and-content",
        heading: "Designs and site content",
        paragraphs: [
          "The nail designs, artwork, written content and branding on this site are the studio's work. Reference images you send stay yours, and are used only to understand and produce your commission.",
        ],
      },
      {
        id: "third-party-links",
        heading: "Links to other platforms",
        paragraphs: [
          "The site links to social platforms such as Instagram, TikTok and Pinterest. Those platforms are separate services with their own terms and privacy practices.",
        ],
      },
      {
        id: "changes",
        heading: "Changes to these terms",
        paragraphs: [
          "These terms may be updated as the studio's service and the storefront change. The current version is always published on this page with its date at the top.",
        ],
      },
      {
        id: "governing-law",
        heading: "Governing law",
        paragraphs: [
          "Nails by Fufs operates from {{address}}, {{country}}, and these terms are governed by the laws of {{country}}.",
        ],
      },
    ],
    metaTitle: "Terms & Conditions — Nails by Fufs",
    metaDescription: "The terms that apply to using the Nails by Fufs website and commissioning a handcrafted press-on set.",
    lastUpdated: "4 October 2026",
  },
};

/* -------------------------------------------------------------------------- */
/* Parsing                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Coercion helpers.
 *
 * Each one returns the fallback rather than throwing, so one wrong-typed field
 * cannot fail a whole document — and therefore cannot fail a page render. They
 * are the reason a malformed row degrades to "the old wording" instead of a 500.
 *
 * `record` is the entry point: it turns an arbitrary `jsonb` value into a plain
 * object (or `{}`), dropping arrays, nulls and scalars, so every field read below
 * is from an object.
 */
function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function str(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

/** A string that may legitimately be empty (clearing a field is a valid edit). */
function strAllowEmpty(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function int(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const rounded = Math.round(value);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
}

function nullableStr(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

const RATIOS: readonly PlaceholderRatio[] = ["portrait", "square", "classic", "wide", "tall"];

function ratio(value: unknown, fallback: PlaceholderRatio): PlaceholderRatio {
  return typeof value === "string" && (RATIOS as readonly string[]).includes(value)
    ? (value as PlaceholderRatio)
    : fallback;
}

function stringList(value: unknown): string[] {
  return array(value).filter((entry): entry is string => typeof entry === "string");
}

/** Optional ordered text block: absent stays absent, so the renderer's `?.` holds. */
function optionalStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const list = stringList(value);
  return list.length > 0 ? list : undefined;
}

function ctaLink(value: unknown, fallback: CtaLink): CtaLink {
  const raw = record(value);
  const href = str(raw.href, fallback.href);
  return {
    label: str(raw.label, fallback.label),
    // A stored href that fails the safety check falls back rather than being
    // rendered: this is the one place a hostile value could otherwise reach an
    // anchor tag.
    href: isValidLinkHref(href) ? href : fallback.href,
  };
}

/**
 * A nav/CTA href that may legitimately be blank.
 *
 * Used for the announcement bar, where clearing the link is how the owner makes
 * the banner non-clickable — a distinct, supported state from "the link is
 * broken".
 *
 * The three cases are deliberately different:
 *   - the field is absent (no stored document) → the shipped `fallback`;
 *   - the field is an empty string          → cleared, and stays cleared;
 *   - the field is present but unsafe       → the `fallback`.
 *
 * Collapsing the first and second cases would mean a document that simply predates
 * this field losing the link it has always had.
 */
function optionalHref(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const href = value.trim();
  if (href.length === 0) return "";
  return isValidLinkHref(href) ? href : fallback;
}

/* --------------------------------------------------------------- structures */

function navItems(value: unknown, fallback: NavItem[]): NavItem[] {
  const rows = array(value);
  if (rows.length === 0) return fallback;

  const seen = new Set<string>();
  const items: NavItem[] = [];
  rows.forEach((row, index) => {
    const raw = record(row);
    const href = str(raw.href, "");
    if (!isValidLinkHref(href)) return;

    // Keys must be unique: a duplicate would collide as a React key and make one
    // item uneditable, so a colliding key is suffixed rather than dropped.
    let key = str(raw.key, `item-${index}`);
    while (seen.has(key)) key = `${key}-${index}`;
    seen.add(key);

    items.push({
      key,
      label: str(raw.label, ""),
      href,
      enabled: bool(raw.enabled, true),
    });
  });

  return items.length > 0 ? items : fallback;
}

function navSections(value: unknown, fallback: NavSection[]): NavSection[] {
  const rows = array(value);
  if (rows.length === 0) return fallback;

  const seen = new Set<string>();
  const sections: NavSection[] = [];
  rows.forEach((row, index) => {
    const raw = record(row);
    const items = navItems(raw.items, []);
    if (items.length === 0) return;

    let key = str(raw.key, `section-${index}`);
    while (seen.has(key)) key = `${key}-${index}`;
    seen.add(key);

    sections.push({ key, title: str(raw.title, ""), items });
  });

  return sections.length > 0 ? sections : fallback;
}

function socialLinks(value: unknown, fallback: SocialLink[]): SocialLink[] {
  const rows = array(value);
  if (rows.length === 0) return fallback;

  const seen = new Set<string>();
  const links: SocialLink[] = [];
  rows.forEach((row, index) => {
    const raw = record(row);
    const href = str(raw.href, "");
    if (!isValidLinkHref(href)) return;

    let key = str(raw.key, `social-${index}`);
    while (seen.has(key)) key = `${key}-${index}`;
    seen.add(key);

    links.push({ key, label: str(raw.label, ""), href, enabled: bool(raw.enabled, true) });
  });

  return links.length > 0 ? links : fallback;
}

/** Reads the fields every image-bearing section shares. */
function imageSlot(raw: Record<string, unknown>, fallback: ImageSlot): ImageSlot {
  return {
    imagePath: nullableStr(raw.imagePath),
    imageAlt: str(raw.imageAlt, fallback.imageAlt),
    imagePlaceholderLabel: str(raw.imagePlaceholderLabel, fallback.imagePlaceholderLabel),
    imagePlaceholderSublabel: str(raw.imagePlaceholderSublabel, fallback.imagePlaceholderSublabel),
    imageRatio: ratio(raw.imageRatio, fallback.imageRatio),
  };
}

/* ------------------------------------------------------------------ parsers */

export function parseIdentity(value: unknown): SiteIdentity {
  const raw = record(value);
  return {
    name: str(raw.name, DEFAULT_IDENTITY.name),
    shortName: str(raw.shortName, DEFAULT_IDENTITY.shortName),
    description: strAllowEmpty(raw.description, DEFAULT_IDENTITY.description),
    tagline: strAllowEmpty(raw.tagline, DEFAULT_IDENTITY.tagline),
    skeletonTagline: strAllowEmpty(raw.skeletonTagline, DEFAULT_IDENTITY.skeletonTagline),
    footerTagline: strAllowEmpty(raw.footerTagline, DEFAULT_IDENTITY.footerTagline),
    mobileTagline: strAllowEmpty(raw.mobileTagline, DEFAULT_IDENTITY.mobileTagline),
    metaTitle: str(raw.metaTitle, DEFAULT_IDENTITY.metaTitle),
    metaDescription: strAllowEmpty(raw.metaDescription, DEFAULT_IDENTITY.metaDescription),
    homeMetaTitle: str(raw.homeMetaTitle, DEFAULT_IDENTITY.homeMetaTitle),
    homeMetaDescription: strAllowEmpty(
      raw.homeMetaDescription,
      DEFAULT_IDENTITY.homeMetaDescription,
    ),
  };
}

export function parseContact(value: unknown): SiteContact {
  const raw = record(value);
  const addressLines = stringList(raw.addressLines);
  return {
    email: str(raw.email, DEFAULT_CONTACT.email),
    phone: str(raw.phone, DEFAULT_CONTACT.phone),
    // An empty address list is meaningful (the owner may not publish one), so
    // it is preserved rather than replaced by the default.
    addressLines: Array.isArray(raw.addressLines) ? addressLines : DEFAULT_CONTACT.addressLines,
    country: strAllowEmpty(raw.country, DEFAULT_CONTACT.country),
    jurisdiction: strAllowEmpty(raw.jurisdiction, DEFAULT_CONTACT.jurisdiction),
  };
}

export function parseAnnouncement(value: unknown): AnnouncementContent {
  const raw = record(value);
  return {
    enabled: bool(raw.enabled, DEFAULT_ANNOUNCEMENT.enabled),
    text: strAllowEmpty(raw.text, DEFAULT_ANNOUNCEMENT.text),
    href: optionalHref(raw.href, DEFAULT_ANNOUNCEMENT.href),
  };
}

export function parseNewsletter(value: unknown): NewsletterContent {
  const raw = record(value);
  return {
    heading: str(raw.heading, DEFAULT_NEWSLETTER.heading),
    description: strAllowEmpty(raw.description, DEFAULT_NEWSLETTER.description),
    ctaLabel: str(raw.ctaLabel, DEFAULT_NEWSLETTER.ctaLabel),
    emailSubject: strAllowEmpty(raw.emailSubject, DEFAULT_NEWSLETTER.emailSubject),
  };
}

export function parseHero(value: unknown): HeroContent {
  const raw = record(value);
  return {
    eyebrow: str(raw.eyebrow, DEFAULT_HERO.eyebrow),
    headline: strAllowEmpty(raw.headline, DEFAULT_HERO.headline),
    headlineAccent: strAllowEmpty(raw.headlineAccent, DEFAULT_HERO.headlineAccent),
    description: strAllowEmpty(raw.description, DEFAULT_HERO.description),
    primaryCta: ctaLink(raw.primaryCta, DEFAULT_HERO.primaryCta),
    secondaryCta: ctaLink(raw.secondaryCta, DEFAULT_HERO.secondaryCta),
    ...imageSlot(raw, DEFAULT_HERO),
  };
}

export function parseFeaturedCollection(value: unknown): FeaturedCollectionContent {
  const raw = record(value);
  return {
    eyebrow: str(raw.eyebrow, DEFAULT_FEATURED_COLLECTION.eyebrow),
    title: str(raw.title, DEFAULT_FEATURED_COLLECTION.title),
    description: strAllowEmpty(raw.description, DEFAULT_FEATURED_COLLECTION.description),
    cta: ctaLink(raw.cta, DEFAULT_FEATURED_COLLECTION.cta),
    hoverHintLabel: strAllowEmpty(raw.hoverHintLabel, DEFAULT_FEATURED_COLLECTION.hoverHintLabel),
    ...imageSlot(raw, DEFAULT_FEATURED_COLLECTION),
  };
}

export function parseProductPreview(value: unknown): ProductPreviewContent {
  const raw = record(value);
  return {
    eyebrow: str(raw.eyebrow, DEFAULT_PRODUCT_PREVIEW.eyebrow),
    title: str(raw.title, DEFAULT_PRODUCT_PREVIEW.title),
    viewAllLabel: str(raw.viewAllLabel, DEFAULT_PRODUCT_PREVIEW.viewAllLabel),
    viewAllHref: optionalHref(raw.viewAllHref, DEFAULT_PRODUCT_PREVIEW.viewAllHref) || "/shop",
    cardHref: optionalHref(raw.cardHref, DEFAULT_PRODUCT_PREVIEW.cardHref) || "/shop",
    // Bounded to a sane tile count: the grid is 4-up on desktop and 2-up on
    // mobile, so allowing an unbounded value would let a typo produce a page of
    // hundreds of tiles.
    productLimit: int(raw.productLimit, DEFAULT_PRODUCT_PREVIEW.productLimit, 1, 24),
  };
}

export function parseCustomFeature(value: unknown): CustomFeatureContent {
  const raw = record(value);
  return {
    eyebrow: str(raw.eyebrow, DEFAULT_CUSTOM_FEATURE.eyebrow),
    title: str(raw.title, DEFAULT_CUSTOM_FEATURE.title),
    description: strAllowEmpty(raw.description, DEFAULT_CUSTOM_FEATURE.description),
    cta: ctaLink(raw.cta, DEFAULT_CUSTOM_FEATURE.cta),
    ...imageSlot(raw, DEFAULT_CUSTOM_FEATURE),
  };
}

export function parseHowItWorks(value: unknown): HowItWorksContent {
  const raw = record(value);
  const rows = array(raw.links);
  const links: GuideCardContent[] = rows
    .map((row, index) => {
      const card = record(row);
      const fallback = DEFAULT_HOW_IT_WORKS.links[index];
      const href = str(card.href, fallback?.href ?? "");
      return {
        title: str(card.title, fallback?.title ?? ""),
        description: strAllowEmpty(card.description, fallback?.description ?? ""),
        // Same reason as `ctaLink`: a stored href that fails the safety check
        // falls back rather than being rendered into an anchor.
        href: isValidLinkHref(href) ? href : (fallback?.href ?? ""),
      };
    })
    // A card with no title has nothing to read and one with no valid href has
    // nowhere to go, so it is dropped rather than rendered as a dead box.
    .filter((card) => card.title.length > 0 && card.href.length > 0);

  return {
    eyebrow: str(raw.eyebrow, DEFAULT_HOW_IT_WORKS.eyebrow),
    title: str(raw.title, DEFAULT_HOW_IT_WORKS.title),
    description: strAllowEmpty(raw.description, DEFAULT_HOW_IT_WORKS.description),
    cta: ctaLink(raw.cta, DEFAULT_HOW_IT_WORKS.cta),
    links: links.length > 0 ? links : DEFAULT_HOW_IT_WORKS.links,
  };
}

export function parseGallery(value: unknown): GalleryContent {
  const raw = record(value);
  const rows = array(raw.items);
  const seen = new Set<string>();

  const items: GalleryItem[] = rows
    .map((row, index) => {
      const item = record(row);
      const fallback = DEFAULT_GALLERY.items[index];
      let key = str(item.key, `gallery-${index + 1}`);
      while (seen.has(key)) key = `${key}-${index}`;
      seen.add(key);

      return {
        key,
        ratio: ratio(item.ratio, fallback?.ratio ?? "portrait"),
        label: str(item.label, fallback?.label ?? ""),
        sublabel: strAllowEmpty(item.sublabel, fallback?.sublabel ?? ""),
        alt: strAllowEmpty(item.alt, fallback?.alt ?? ""),
        imagePath: nullableStr(item.imagePath),
      };
    })
    // A tile with neither a label nor a photo would render an empty frame, so it
    // is dropped rather than shown.
    .filter((item) => item.label.length > 0 || item.imagePath !== null);

  return {
    eyebrow: str(raw.eyebrow, DEFAULT_GALLERY.eyebrow),
    title: str(raw.title, DEFAULT_GALLERY.title),
    description: strAllowEmpty(raw.description, DEFAULT_GALLERY.description),
    items: items.length > 0 ? items : DEFAULT_GALLERY.items,
  };
}

export function parseFinalCta(value: unknown): FinalCtaContent {
  const raw = record(value);
  return {
    eyebrow: str(raw.eyebrow, DEFAULT_FINAL_CTA.eyebrow),
    title: str(raw.title, DEFAULT_FINAL_CTA.title),
    description: strAllowEmpty(raw.description, DEFAULT_FINAL_CTA.description),
    primaryCta: ctaLink(raw.primaryCta, DEFAULT_FINAL_CTA.primaryCta),
    secondaryCta: ctaLink(raw.secondaryCta, DEFAULT_FINAL_CTA.secondaryCta),
  };
}

export function parseHomeNewsletter(value: unknown): HomeNewsletterContent {
  const raw = record(value);
  return {
    eyebrow: str(raw.eyebrow, DEFAULT_HOME_NEWSLETTER.eyebrow),
    title: str(raw.title, DEFAULT_HOME_NEWSLETTER.title),
    description: strAllowEmpty(raw.description, DEFAULT_HOME_NEWSLETTER.description),
    ctaLabel: str(raw.ctaLabel, DEFAULT_HOME_NEWSLETTER.ctaLabel),
    emailSubject: strAllowEmpty(raw.emailSubject, DEFAULT_HOME_NEWSLETTER.emailSubject),
  };
}

export function parseFaq(value: unknown): FaqPageContent {
  const raw = record(value);
  const hero = record(raw.hero);

  const categories: FaqCategoryContent[] = array(raw.categories)
    .map((row) => {
      const category = record(row);
      return { id: str(category.id, ""), label: str(category.label, "") };
    })
    .filter((category) => category.id.length > 0 && category.label.length > 0);

  const items: FaqItemContent[] = array(raw.items)
    .map((row, index) => {
      const item = record(row);
      return {
        id: str(item.id, `faq-${index + 1}`),
        category: str(item.category, ""),
        question: str(item.question, ""),
        answer: strAllowEmpty(item.answer, ""),
      };
    })
    .filter((item) => item.question.length > 0);

  const ctaRaw = record(raw.cta);
  const fallbackCta = DEFAULT_FAQ.cta;

  return {
    hero: {
      eyebrow: str(hero.eyebrow, DEFAULT_FAQ.hero.eyebrow),
      title: str(hero.title, DEFAULT_FAQ.hero.title),
      description: strAllowEmpty(hero.description, DEFAULT_FAQ.hero.description),
    },
    categories: categories.length > 0 ? categories : DEFAULT_FAQ.categories,
    items: items.length > 0 ? items : DEFAULT_FAQ.items,
    cta: {
      eyebrow: str(ctaRaw.eyebrow, fallbackCta.eyebrow),
      title: str(ctaRaw.title, fallbackCta.title),
      description: strAllowEmpty(ctaRaw.description, fallbackCta.description),
      primaryCta: ctaLink(ctaRaw.primaryCta, fallbackCta.primaryCta),
      secondaryCta: ctaLink(ctaRaw.secondaryCta, fallbackCta.secondaryCta),
    },
    footerNote: strAllowEmpty(raw.footerNote, DEFAULT_FAQ.footerNote),
  };
}

export function parsePolicy(value: unknown, slug: string): PolicyPageContent {
  const fallback = DEFAULT_POLICIES[slug] ?? DEFAULT_POLICIES["privacy-policy"];
  const raw = record(value);

  const sections: LegalSectionContent[] = array(raw.sections)
    .map((row, index) => {
      const section = record(row);
      const existing = fallback.sections[index];
      return {
        id: str(section.id, existing?.id ?? `section-${index + 1}`),
        heading: str(section.heading, existing?.heading ?? ""),
        paragraphs: optionalStringList(section.paragraphs),
        bullets: optionalStringList(section.bullets),
      };
    })
    // A section with no heading and no body would render an empty numbered
    // block, so it is dropped.
    .filter(
      (section) =>
        section.heading.length > 0 ||
        (section.paragraphs?.length ?? 0) > 0 ||
        (section.bullets?.length ?? 0) > 0,
    );

  return {
    eyebrow: str(raw.eyebrow, fallback.eyebrow),
    title: str(raw.title, fallback.title),
    description: strAllowEmpty(raw.description, fallback.description),
    intro: Array.isArray(raw.intro) ? stringList(raw.intro) : fallback.intro,
    sections: sections.length > 0 ? sections : fallback.sections,
    metaTitle: str(raw.metaTitle, fallback.metaTitle),
    metaDescription: strAllowEmpty(raw.metaDescription, fallback.metaDescription),
    lastUpdated: str(raw.lastUpdated, fallback.lastUpdated),
  };
}

/**
 * The empty tree, used when the database cannot be read at all.
 *
 * Every document falls back to its code default, so the storefront renders the
 * content it shipped with rather than an error page.
 */
export const DEFAULT_SITE_CONTENT: SiteContent = {
  identity: DEFAULT_IDENTITY,
  contact: DEFAULT_CONTACT,
  socials: DEFAULT_SOCIALS,
  announcement: DEFAULT_ANNOUNCEMENT,
  nav: { main: DEFAULT_MAIN_NAV, mobile: DEFAULT_MOBILE_NAV, footer: DEFAULT_FOOTER_NAV },
  newsletter: DEFAULT_NEWSLETTER,
  home: {
    hero: DEFAULT_HERO,
    featuredCollection: DEFAULT_FEATURED_COLLECTION,
    productPreview: DEFAULT_PRODUCT_PREVIEW,
    customFeature: DEFAULT_CUSTOM_FEATURE,
    howItWorks: DEFAULT_HOW_IT_WORKS,
    gallery: DEFAULT_GALLERY,
    finalCta: DEFAULT_FINAL_CTA,
    newsletter: DEFAULT_HOME_NEWSLETTER,
  },
  faq: DEFAULT_FAQ,
  policies: DEFAULT_POLICIES,
};

/**
 * Builds the whole typed tree from the raw `site_content` rows.
 *
 * One function so that the read path (`site-content.ts`) and the write path
 * (which must return the state it just produced) cannot disagree about how a row
 * maps to a document.
 */
export function parseSiteContent(rows: { key: string; value: unknown }[]): SiteContent {
  const byKey = new Map(rows.map((row) => [row.key, row.value]));
  const get = (key: string) => byKey.get(key);

  const policies: Record<string, PolicyPageContent> = {};
  for (const slug of POLICY_SLUGS) {
    policies[slug] = parsePolicy(get(policyKey(slug)), slug);
  }

  return {
    identity: parseIdentity(get(CONTENT_KEYS.identity)),
    contact: parseContact(get(CONTENT_KEYS.contact)),
    socials: socialLinks(get(CONTENT_KEYS.socials), DEFAULT_SOCIALS),
    announcement: parseAnnouncement(get(CONTENT_KEYS.announcement)),
    nav: {
      main: navItems(get(CONTENT_KEYS.navMain), DEFAULT_MAIN_NAV),
      mobile: navItems(get(CONTENT_KEYS.navMobile), DEFAULT_MOBILE_NAV),
      footer: navSections(get(CONTENT_KEYS.navFooter), DEFAULT_FOOTER_NAV),
    },
    newsletter: parseNewsletter(get(CONTENT_KEYS.newsletter)),
    home: {
      hero: parseHero(get(CONTENT_KEYS.hero)),
      featuredCollection: parseFeaturedCollection(get(CONTENT_KEYS.featuredCollection)),
      productPreview: parseProductPreview(get(CONTENT_KEYS.productPreview)),
      customFeature: parseCustomFeature(get(CONTENT_KEYS.customFeature)),
      howItWorks: parseHowItWorks(get(CONTENT_KEYS.howItWorks)),
      gallery: parseGallery(get(CONTENT_KEYS.gallery)),
      finalCta: parseFinalCta(get(CONTENT_KEYS.finalCta)),
      newsletter: parseHomeNewsletter(get(CONTENT_KEYS.homeNewsletter)),
    },
    faq: parseFaq(get(CONTENT_KEYS.faq)),
    policies,
  };
}

/* -------------------------------------------------------------------------- */
/* Token resolution                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Replaces `{{token}}` placeholders in stored prose with confirmed business
 * details.
 *
 * Policy copy refers to the studio's email, phone, address, country and
 * jurisdiction. Storing the resolved text would freeze today's email into nine
 * paragraphs and six bullets, so the migration kept the tokens the pages used to
 * interpolate and this function performs that interpolation at render time.
 *
 * Everything that is *not* a known token is left untouched, so a stray `{{` in
 * ordinary prose cannot be swallowed, and an unknown token stays visible rather
 * than silently disappearing.
 */
export const CONTENT_TOKENS = [
  "email",
  "phone",
  "address",
  "country",
  "jurisdiction",
] as const;

export type ContentToken = (typeof CONTENT_TOKENS)[number];

export function resolveTokens(text: string, values: Record<ContentToken, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    (CONTENT_TOKENS as readonly string[]).includes(name)
      ? values[name as ContentToken]
      : match,
  );
}

/** The token values for a given contact document. */
export function tokenValues(contact: SiteContact): Record<ContentToken, string> {
  return {
    email: contact.email,
    phone: contact.phone,
    address: contact.addressLines.join(", "),
    country: contact.country,
    jurisdiction: contact.jurisdiction,
  };
}

/** Applies `resolveTokens` to every string in a policy document. */
export function resolvePolicyTokens(
  policy: PolicyPageContent,
  contact: SiteContact,
): PolicyPageContent {
  const values = tokenValues(contact);
  const resolve = (text: string) => resolveTokens(text, values);

  return {
    ...policy,
    description: resolve(policy.description),
    intro: policy.intro.map(resolve),
    metaDescription: resolve(policy.metaDescription),
    sections: policy.sections.map((section) => ({
      ...section,
      heading: resolve(section.heading),
      ...(section.paragraphs ? { paragraphs: section.paragraphs.map(resolve) } : {}),
      ...(section.bullets ? { bullets: section.bullets.map(resolve) } : {}),
    })),
  };
}
