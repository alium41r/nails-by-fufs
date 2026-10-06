
/**
 * Plain-language labels for every editable field.
 *
 * ## Why this file exists
 *
 * The Studio content editor used to show the document as raw JSON. It was
 * accurate and always in step with the schema, but it asked the owner to read and
 * type `{"headlineAccent": "made personal."}` in order to change three words on
 * their own homepage — which is developer tooling, not a shop tool.
 *
 * A form needs labels, and labels are a writing decision that cannot be derived
 * from a TypeScript type: `headlineAccent` is "Second half of the headline" to a
 * person and `metaDescription` is "Description for search engines". So the copy
 * lives here, next to the shapes it describes, and `contentFieldGroups` maps a
 * document key to the fields to render.
 *
 * ## Why this cannot silently go out of date
 *
 * A hand-written form per document would be a maintenance cost proportional to the
 * content model, and would quietly stop offering a field the moment one was added
 * — the exact failure mode the JSON editor avoided. Two things prevent that here:
 *
 *   1. The form renders `value` for every key in the field list and *writes back
 *      the whole document*, starting from the loaded one. A field that is not
 *      listed is left exactly as it was, never dropped.
 *   2. `tests/studio-content-fields.test.ts` asserts, for every document, that the
 *      field list covers every key the parser produces. Adding a field to a
 *      document without labelling it fails a test rather than disappearing from
 *      the editor.
 *
 * ## Why this file is not `server-only`
 *
 * It is imported by the Studio panel, which is a Client Component. It contains
 * labels and input kinds only — no content, no defaults, no database access.
 */

import { CONTENT_KEYS, POLICY_SLUGS, policyKey } from "@/lib/site-content-schema";

/** How a field should be presented, and how a person should read it. */
export type FieldKind =
  | "text"
  | "longText"
  | "link"
  | "toggle"
  | "number"
  | "image"
  | "choice"
  | "list"
  | "records";

export interface FieldSpec {
  /** Dotted path inside the document, e.g. `primaryCta.label` or `steps.0.title`. */
  path: string;
  /** What the owner sees above the input. */
  label: string;
  kind: FieldKind;
  /** One short line of guidance, in plain language. */
  hint?: string;
  /** Only for `link`: the "Goes to" sub-field's own label. */
  hrefLabel?: string;
  /** Only for `choice`. */
  choices?: { value: string; label: string }[];
  /** Only for `number`. */
  min?: number;
  max?: number;
}

/** A titled run of fields, so a long document reads as sections. */
export interface FieldGroup {
  title: string;
  fields: FieldSpec[];
}

const CTA = (path: string, label: string, hrefLabel: string): FieldSpec[] => [
  { path: `${path}.label`, label: "Button text", kind: "text" },
  { path: `${path}.href`, label: "Goes to", kind: "link", hrefLabel },
];

const RATIOS: { value: string; label: string }[] = [
  { value: "portrait", label: "Tall (4:5)" },
  { value: "square", label: "Square (1:1)" },
  { value: "wide", label: "Wide (16:9)" },
  { value: "classic", label: "Classic (3:2)" },
  { value: "tall", label: "Very tall (9:16)" },
];

/** Shared image-slot fields, used by every section that has a picture. */
const IMAGE_FIELDS = (): FieldSpec[] => [
  { path: "imagePath", label: "Photo", kind: "image" },
  { path: "imageAlt", label: "Photo description", kind: "text", hint: "Read aloud by screen readers, and shown if the photo fails to load." },
  { path: "imageRatio", label: "Shape", kind: "choice", choices: RATIOS },
  { path: "imagePlaceholderLabel", label: "Text on the empty frame", kind: "text", hint: "Only shown until a photo is uploaded." },
  { path: "imagePlaceholderSublabel", label: "Caption under that text", kind: "text" },
];

/**
 * Every document the owner can edit, described as sections of labelled fields.
 *
 * Order matters: it is the order the form renders, and it follows the order the
 * sections appear on the page.
 */
export const CONTENT_FIELD_GROUPS: Record<string, FieldGroup[]> = {
  [CONTENT_KEYS.announcement]: [
    {
      title: "Announcement bar",
      fields: [
        { path: "enabled", label: "Show the announcement bar", kind: "toggle" },
        { path: "text", label: "Message", kind: "text" },
        { path: "href", label: "Link (optional)", kind: "link", hrefLabel: "Goes to", hint: "Leave empty to show the message as plain text instead of a link." },
      ],
    },
  ],

  [CONTENT_KEYS.identity]: [
    {
      title: "Your studio",
      fields: [
        { path: "name", label: "Business name", kind: "text" },
        { path: "shortName", label: "Short name", kind: "text", hint: "The small line under the logo in the header." },
        { path: "tagline", label: "Sub-line under the logo", kind: "text" },
        { path: "skeletonTagline", label: "Sub-line while a page is loading", kind: "text", hint: "Shown for a moment during navigation, in the same place." },
        { path: "footerTagline", label: "Sub-line in the footer", kind: "text" },
        { path: "mobileTagline", label: "Sub-line in the mobile menu", kind: "text" },
      ],
    },
    {
      title: "Search and sharing",
      fields: [
        { path: "description", label: "Short description of the studio", kind: "longText", hint: "Used as a fallback wherever a more specific description is not set." },
        { path: "metaTitle", label: "Site title", kind: "text", hint: "Shown in the browser tab and when a link is shared." },
        { path: "metaDescription", label: "Site description", kind: "longText" },
        { path: "homeMetaTitle", label: "Homepage title", kind: "text" },
        { path: "homeMetaDescription", label: "Homepage description", kind: "longText" },
      ],
    },
  ],

  [CONTENT_KEYS.contact]: [
    {
      title: "Public contact details",
      fields: [
        { path: "email", label: "Email", kind: "text" },
        { path: "phone", label: "Phone", kind: "text" },
        { path: "addressLines", label: "Address", kind: "list", hint: "One line per row. Only the area is published." },
        { path: "country", label: "Country", kind: "text" },
        { path: "jurisdiction", label: "Governing law", kind: "text", hint: "Named in the terms. Usually the same as the country." },
      ],
    },
  ],

  [CONTENT_KEYS.socials]: [
    {
      title: "Social links",
      // A whole-document array, so the path is the document root.
      fields: [{ path: "", label: "Link", kind: "records" }],
    },
  ],

  [CONTENT_KEYS.navMain]: [
    { title: "Header menu", fields: [{ path: "", label: "Item", kind: "records" }] },
  ],
  [CONTENT_KEYS.navMobile]: [
    { title: "Mobile menu", fields: [{ path: "", label: "Item", kind: "records" }] },
  ],
  [CONTENT_KEYS.navFooter]: [
    { title: "Footer menu", fields: [{ path: "", label: "Column", kind: "records" }] },
  ],

  [CONTENT_KEYS.newsletter]: [
    {
      title: "Footer newsletter block",
      fields: [
        { path: "heading", label: "Heading", kind: "text" },
        { path: "description", label: "Description", kind: "longText" },
        { path: "ctaLabel", label: "Button text", kind: "text" },
        { path: "emailSubject", label: "Subject line of the email it opens", kind: "text" },
      ],
    },
  ],

  [CONTENT_KEYS.hero]: [
    {
      title: "Headline",
      fields: [
        { path: "eyebrow", label: "Small line above the headline", kind: "text" },
        { path: "headline", label: "Headline", kind: "text" },
        { path: "headlineAccent", label: "Second half of the headline", kind: "text", hint: "Shown in italics, in your accent colour." },
        { path: "description", label: "Paragraph under the headline", kind: "longText" },
      ],
    },
    {
      title: "Buttons",
      fields: [
        ...CTA("primaryCta", "First button", "Goes to"),
        ...CTA("secondaryCta", "Second button", "Goes to"),
      ],
    },
    { title: "Photo", fields: IMAGE_FIELDS() },
  ],

  [CONTENT_KEYS.featuredCollection]: [
    {
      title: "Text",
      fields: [
        { path: "eyebrow", label: "Small line above the title", kind: "text" },
        { path: "title", label: "Section title", kind: "text" },
        { path: "description", label: "Short description", kind: "longText" },
        { path: "hoverHintLabel", label: "Text that appears on hover", kind: "text" },
      ],
    },
    { title: "Link", fields: CTA("cta", "Link", "Goes to") },
    { title: "Photo", fields: IMAGE_FIELDS() },
  ],

  [CONTENT_KEYS.productPreview]: [
    {
      title: "Shop preview",
      fields: [
        { path: "eyebrow", label: "Small line above the title", kind: "text" },
        { path: "title", label: "Section title", kind: "text" },
        { path: "viewAllLabel", label: "“See all” link text", kind: "text" },
        { path: "viewAllHref", label: "“See all” link goes to", kind: "link", hrefLabel: "Goes to" },
        { path: "cardHref", label: "Each product tile goes to", kind: "link", hrefLabel: "Goes to" },
        { path: "productLimit", label: "How many products to show", kind: "number", min: 1, max: 24 },
      ],
    },
  ],

  [CONTENT_KEYS.customFeature]: [
    {
      title: "Text",
      fields: [
        { path: "eyebrow", label: "Small line above the title", kind: "text" },
        { path: "title", label: "Title", kind: "text" },
        { path: "description", label: "Description", kind: "longText" },
      ],
    },
    { title: "Button", fields: CTA("cta", "Button", "Goes to") },
    { title: "Photo", fields: IMAGE_FIELDS() },
  ],

  [CONTENT_KEYS.howItWorks]: [
    {
      title: "Section",
      fields: [
        { path: "eyebrow", label: "Small line above the title", kind: "text" },
        { path: "title", label: "Section title", kind: "text" },
        { path: "description", label: "Description", kind: "longText" },
      ],
    },
    { title: "Link", fields: CTA("cta", "Link", "Goes to") },
    {
      title: "The guide cards",
      fields: [
        {
          path: "links",
          label: "Guide card",
          kind: "records",
          hint: "Each card is a link to one page. A card with no title or no destination is not shown.",
        },
      ],
    },
  ],

  [CONTENT_KEYS.gallery]: [
    {
      title: "Section",
      fields: [
        { path: "eyebrow", label: "Small line above the title", kind: "text" },
        { path: "title", label: "Section title", kind: "text" },
        { path: "description", label: "Short description", kind: "longText" },
      ],
    },
    { title: "The photos", fields: [{ path: "items", label: "Photo", kind: "records" }] },
  ],

  [CONTENT_KEYS.finalCta]: [
    {
      title: "Text",
      fields: [
        { path: "eyebrow", label: "Small line above the title", kind: "text" },
        { path: "title", label: "Title", kind: "text" },
        { path: "description", label: "Description", kind: "longText" },
      ],
    },
    {
      title: "Buttons",
      fields: [
        ...CTA("primaryCta", "First button", "Goes to"),
        ...CTA("secondaryCta", "Second button", "Goes to"),
      ],
    },
  ],

  [CONTENT_KEYS.homeNewsletter]: [
    {
      title: "Release sign-up block",
      fields: [
        { path: "eyebrow", label: "Small line above the title", kind: "text" },
        { path: "title", label: "Title", kind: "text" },
        { path: "description", label: "Description", kind: "longText" },
        { path: "ctaLabel", label: "Button text", kind: "text" },
        { path: "emailSubject", label: "Subject line of the email it opens", kind: "text" },
      ],
    },
  ],

  [CONTENT_KEYS.faq]: [
    {
      title: "Page heading",
      fields: [
        { path: "hero.eyebrow", label: "Small line above the title", kind: "text" },
        { path: "hero.title", label: "Title", kind: "text" },
        { path: "hero.description", label: "Description", kind: "longText" },
        { path: "footerNote", label: "Note under the questions", kind: "text" },
      ],
    },
    { title: "Questions and answers", fields: [{ path: "items", label: "Question", kind: "records" }] },
    { title: "Categories", fields: [{ path: "categories", label: "Category", kind: "records" }] },
    {
      title: "Closing section",
      fields: [
        { path: "cta.eyebrow", label: "Small line above the title", kind: "text" },
        { path: "cta.title", label: "Title", kind: "text" },
        { path: "cta.description", label: "Description", kind: "longText" },
        ...CTA("cta.primaryCta", "First button", "Goes to"),
        ...CTA("cta.secondaryCta", "Second button", "Goes to"),
      ],
    },
  ],
};

/**
 * Policy pages share one shape, so they share one description.
 *
 * Sections are a list of ordered blocks, each with a heading and free
 * paragraphs or bullets — which is exactly how a policy is written, so the form
 * presents them that way rather than as a single wall of text.
 */
for (const slug of POLICY_SLUGS) {
  CONTENT_FIELD_GROUPS[policyKey(slug)] = [
    {
      title: "Page heading",
      fields: [
        { path: "eyebrow", label: "Small line above the title", kind: "text" },
        { path: "title", label: "Title", kind: "text" },
        { path: "description", label: "Short description", kind: "longText" },
        { path: "intro", label: "Opening paragraphs", kind: "list", hint: "One paragraph per row." },
        { path: "lastUpdated", label: "“Last updated” date", kind: "text" },
      ],
    },
    {
      title: "Sections",
      fields: [{ path: "sections", label: "Section", kind: "records" }],
    },
    {
      title: "Search and sharing",
      fields: [
        { path: "metaTitle", label: "Page title", kind: "text" },
        { path: "metaDescription", label: "Page description", kind: "longText" },
      ],
    },
  ];
}

/** The field groups for a document, or null when it has no description yet. */
export function fieldGroupsFor(key: string): FieldGroup[] | null {
  return CONTENT_FIELD_GROUPS[key] ?? null;
}
