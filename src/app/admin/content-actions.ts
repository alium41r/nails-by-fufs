"use server";

import { invalidateSiteContent } from "@/lib/catalogue-cache";
import { getAdminUser } from "@/lib/admin/auth";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  SITE_IMAGE_BUCKET,
  IMAGE_EXTENSION,
  isSiteAssetPath,
  siteAssetPrefix,
} from "@/lib/admin/paths";
import { getReferenceStorage } from "@/lib/supabase/admin";
import { guardRateLimit } from "@/lib/security/rate-limit-guard";
import {
  isWritableContentKey,
  resetContentDocument,
  writeContentDocument,
} from "@/lib/site-content";
import { parseSiteContent } from "@/lib/site-content-schema";

/**
 * The write surface for owner-managed storefront content.
 *
 * ## Every action authorises independently
 *
 * `assertAdmin()` runs first in every export below. Nothing here trusts the UI,
 * Studio Mode being open, the proxy, or a previous successful call in the same
 * session: a forged invocation from a non-admin gets `unauthorized` and no side
 * effect. `src/lib/site-content.ts` is `server-only` and does not check
 * authorisation itself, precisely so that this module is the one place per action
 * where access is decided.
 *
 * ## Why writes take a whole document
 *
 * The editors present a document as one form (the hero, a policy page), and one
 * UPDATE keeps the change atomic — there is no window in which half the hero has
 * been saved. It also means the stored value always parses as a complete
 * document, so the read path never has to merge a partial row with a default.
 *
 * ## Validation
 *
 * The incoming document is parsed by the same parsers the read path uses, and the
 * *parsed* result is what gets stored. A caller therefore cannot store a shape the
 * storefront would reject, links that fail the scheme/blocklist check are dropped
 * by the parser rather than saved, and unknown fields are discarded instead of
 * accumulating. The parsers fall back per field, so a partially-filled document
 * saves as a complete one.
 */

const UNAUTHORIZED = { ok: false as const, error: "Not authorised." };
const NOT_ALLOWED = { ok: false as const, error: "That content cannot be edited here." };

export type ContentActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

async function assertAdmin(): Promise<boolean> {
  return (await getAdminUser()) !== null;
}

/**
 * Normalises and stores one content document.
 *
 * `key` is checked against the closed set of keys the code renders, so a forged
 * request cannot create arbitrary rows in the table, and a typo in an editor
 * cannot produce a row that silently does nothing.
 */
export async function saveContentDocument(input: {
  key: string;
  value: unknown;
}): Promise<ContentActionResult> {
  if (!(await assertAdmin())) return UNAUTHORIZED;
  if (!isWritableContentKey(input.key)) return NOT_ALLOWED;

  // Round-tripping through the parsers is the validation step: it drops unknown
  // keys, coerces wrong types back to defaults, and rejects unsafe hrefs.
  const normalised = readBack(input.key, parseSiteContent([{ key: input.key, value: input.value }]));

  const result = await writeContentDocument(input.key, normalised);
  if (!result.ok) return { ok: false, error: result.error ?? "That could not be saved." };

  invalidateSiteContent();
  return { ok: true, message: "Saved." };
}

/**
 * Several documents in one call.
 *
 * Used by the Control Center's settings form, which submits identity, contact
 * and socials together because they are one conceptual screen. Each key
 * is still authorised and validated individually, and a failure on any key aborts
 * before anything is written, so the form cannot half-apply.
 */
export async function saveContentDocuments(
  inputs: { key: string; value: unknown }[],
): Promise<ContentActionResult> {
  if (!(await assertAdmin())) return UNAUTHORIZED;
  if (inputs.length === 0) return { ok: false, error: "Nothing to save." };

  for (const input of inputs) {
    if (!isWritableContentKey(input.key)) return NOT_ALLOWED;
  }

  for (const input of inputs) {
    const normalised = readBack(
      input.key,
      parseSiteContent([{ key: input.key, value: input.value }]),
    );
    const result = await writeContentDocument(input.key, normalised);
    if (!result.ok) return { ok: false, error: result.error ?? "That could not be saved." };
  }

  invalidateSiteContent();
  return { ok: true, message: "Saved." };
}

/**
 * Restores one document to the value the code ships with.
 *
 * "Reset to default" is a row delete, because the defaults live in code. That
 * means there is exactly one copy of the shipped wording and it can never drift
 * from what a fresh database would contain.
 */
export async function resetContentDocumentAction(input: {
  key: string;
}): Promise<ContentActionResult> {
  if (!(await assertAdmin())) return UNAUTHORIZED;
  if (!isWritableContentKey(input.key)) return NOT_ALLOWED;

  const result = await resetContentDocument(input.key);
  if (!result.ok) return { ok: false, error: result.error ?? "That could not be reset." };

  invalidateSiteContent();
  return { ok: true, message: "Restored to the original wording." };
}

/**
 * Pulls one key back out of a parsed tree.
 *
 * Parsing the whole tree and re-reading the key means the stored value went
 * through exactly the same code the storefront uses, rather than a second
 * validator that could disagree with it.
 */
function readBack(key: string, content: ReturnType<typeof parseSiteContent>): unknown {
  const map: Record<string, unknown> = {
    "site.identity": content.identity,
    "site.contact": content.contact,
    "site.socials": content.socials,
    "site.announcement": content.announcement,
    "site.nav.main": content.nav.main,
    "site.nav.mobile": content.nav.mobile,
    "site.nav.footer": content.nav.footer,
    "site.newsletter": content.newsletter,
    "home.hero": content.home.hero,
    "home.featuredCollection": content.home.featuredCollection,
    "home.productPreview": content.home.productPreview,
    "home.customFeature": content.home.customFeature,
    "home.howItWorks": content.home.howItWorks,
    "home.gallery": content.home.gallery,
    "home.finalCta": content.home.finalCta,
    "home.newsletter": content.home.newsletter,
    "page.faq": content.faq,
  };
  if (key in map) return map[key];

  const policyPrefix = "page.policy.";
  if (key.startsWith(policyPrefix)) {
    return content.policies[key.slice(policyPrefix.length)];
  }
  return undefined;
}

/* -------------------------------------------------------------------------- */
/* Content imagery                                                             */
/* -------------------------------------------------------------------------- */

export type SiteImageUploadTarget =
  | { ok: true; path: string; token: string; signedUrl: string }
  | { ok: false; error: string };

/**
 * Mints one short-lived signed upload URL for a storefront image slot.
 *
 * The path is generated here from the content key and the field, never by the
 * browser, so a client cannot choose a path, overwrite another slot's object, or
 * write outside the folder it was authorised for. `isSiteAssetPath` is the second
 * half of that guarantee: `finalizeSiteImageUpload` refuses any path that is not
 * exactly `site/<key>/<uuid>.<ext>`.
 */
export async function prepareSiteImageUpload(input: {
  key: string;
  contentType: string;
  sizeBytes: number;
}): Promise<SiteImageUploadTarget> {
  if (!(await assertAdmin())) return { ok: false, error: "Not authorised." };
  if (!isWritableContentKey(input.key)) return { ok: false, error: "Unknown content slot." };

  if (!ALLOWED_IMAGE_TYPES.includes(input.contentType)) {
    return { ok: false, error: "Unsupported image type. Use PNG, JPG, WebP, HEIC or GIF." };
  }
  if (
    !Number.isFinite(input.sizeBytes) ||
    input.sizeBytes <= 0 ||
    input.sizeBytes > MAX_IMAGE_BYTES
  ) {
    return { ok: false, error: "Images must be 10 MB or smaller." };
  }

  // Uploads are the expensive surface here, so they are rate limited through the
  // same guard as the other admin upload paths.
  const limited = await guardRateLimit("adminUpload");
  if (!limited.allowed) return { ok: false, error: limited.message };

  // Must match `siteAssetPrefix()` exactly: the folder is derived from the
  // content key, and `finalizeSiteImageUpload` refuses any path that is not
  // inside this key's folder. Building the path here without the `site/` root
  // produced a path the validator rejected, which is the guard doing its job.
  const path = `${siteAssetPrefix(input.key)}${crypto.randomUUID()}.${IMAGE_EXTENSION[input.contentType]}`;
  const { data, error } = await getReferenceStorage()
    .from(SITE_IMAGE_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) return { ok: false, error: "Could not prepare the upload. Please try again." };

  return { ok: true, path, token: data.token, signedUrl: data.signedUrl };
}

/**
 * Confirms the object exists and points a content field at it.
 *
 * `pathField` addresses the field inside the document, so the same action serves
 * every image slot — a hero, a lookbook, a gallery tile — without a per-slot
 * action. It is validated against the document's real fields by the parser: a
 * field name that no parser reads is silently dropped rather than stored.
 */
export async function finalizeSiteImageUpload(input: {
  key: string;
  path: string;
  pathField?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await assertAdmin())) return { ok: false, error: "Not authorised." };
  if (!isWritableContentKey(input.key)) return { ok: false, error: "Unknown content slot." };
  if (!isSiteAssetPath(input.path, input.key)) {
    return { ok: false, error: "That image path is not valid for this slot." };
  }

  const { data: info, error } = await getReferenceStorage().from(SITE_IMAGE_BUCKET).info(input.path);
  if (error || !info) return { ok: false, error: "The upload did not complete. Please try again." };
  if (!ALLOWED_IMAGE_TYPES.includes(info.contentType as string)) {
    return { ok: false, error: "Unsupported image type." };
  }
  const size = info.size ?? 0;
  if (size <= 0 || size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Images must be 10 MB or smaller." };
  }

  const result = await setImagePath(input.key, input.pathField ?? "imagePath", input.path);
  if (!result.ok) return { ok: false, error: result.error };

  return { ok: true };
}

/** Clears an image slot and removes the object it pointed at, when it is ours. */
export async function clearSiteImage(input: {
  key: string;
  pathField?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await assertAdmin())) return { ok: false, error: "Not authorised." };
  if (!isWritableContentKey(input.key)) return { ok: false, error: "Unknown content slot." };

  const result = await setImagePath(input.key, input.pathField ?? "imagePath", null);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}

/**
 * Writes one image path into a content document.
 *
 * Read-modify-write on the whole document, because that is the unit the table
 * stores and the parsers validate. The previous object is removed only after the
 * new path is committed, so a failure can never leave a slot pointing at a deleted
 * file.
 */
async function setImagePath(
  key: string,
  pathField: string,
  path: string | null,
): Promise<ContentActionResult> {
  const { getSiteContent } = await import("@/lib/site-content");
  const content = await getSiteContent();
  const current = readBack(key, content) as Record<string, unknown> | undefined;

  if (!current || typeof current !== "object") {
    return { ok: false, error: "That content slot could not be read." };
  }

  const previous = readPath(current, pathField);
  const next = writePath(current, pathField, path);

  if (!next.ok) return { ok: false, error: next.error };

  const normalised = readBack(key, parseSiteContent([{ key, value: next.value }]));
  const written = await writeContentDocument(key, normalised);
  if (!written.ok) return { ok: false, error: written.error ?? "That could not be saved." };

  // Replace rather than accumulate: drop the object this slot previously held.
  if (previous && previous !== path && isSiteAssetPath(previous, key)) {
    await getReferenceStorage().from(SITE_IMAGE_BUCKET).remove([previous]);
  }

  invalidateSiteContent();
  return { ok: true, message: path ? "Image updated." : "Image removed." };
}

/** Reads a possibly-nested `a.b.0.c` style field path. */
function readPath(source: Record<string, unknown>, pathField: string): string | null {
  const segments = pathField.split(".");
  let cursor: unknown = source;
  for (const segment of segments) {
    if (cursor === null || typeof cursor !== "object") return null;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return typeof cursor === "string" && cursor.length > 0 ? cursor : null;
}

/**
 * Writes a possibly-nested field path such as `imagePath` or `items.2.imagePath`.
 *
 * Refuses a path that does not already exist, so a forged `pathField` cannot add
 * arbitrary keys to a document — it can only re-point an image slot that is really
 * there. Segments address object keys, or array indices when the current container
 * is an array.
 */
function writePath(
  source: Record<string, unknown>,
  pathField: string,
  value: string | null,
): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  const segments = pathField.split(".");
  const clone = structuredClone(source) as Record<string, unknown>;
  const missing = { ok: false as const, error: "That image slot does not exist." };

  // Walks every segment but the last, which is assigned at the end.
  let cursor: Record<string, unknown> | unknown[] = clone;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];

    if (Array.isArray(cursor)) {
      const position = Number(segment);
      if (!Number.isInteger(position) || position < 0 || position >= cursor.length) return missing;
      const child = cursor[position];
      if (child === null || typeof child !== "object") return missing;
      cursor = child as Record<string, unknown> | unknown[];
      continue;
    }

    if (!(segment in cursor)) return missing;
    const child = cursor[segment];
    if (child === null || typeof child !== "object") return missing;
    cursor = child as Record<string, unknown> | unknown[];
  }

  const last = segments[segments.length - 1];

  if (Array.isArray(cursor)) {
    const position = Number(last);
    if (!Number.isInteger(position) || position < 0 || position >= cursor.length) return missing;
    cursor[position] = value;
    return { ok: true, value: clone };
  }

  if (!(last in cursor)) return missing;
  cursor[last] = value;
  return { ok: true, value: clone };
}

/* -------------------------------------------------------------------------- */
/* Store settings                                                              */
/* -------------------------------------------------------------------------- */

export interface StoreSettingsInput {
  /** `site.identity` fields. */
  name: string;
  shortName: string;
  tagline: string;
  footerTagline: string;
  mobileTagline: string;
  metaTitle: string;
  metaDescription: string;
  homeMetaTitle: string;
  homeMetaDescription: string;
  /** `site.contact` fields. `addressLines` arrives newline-separated. */
  email: string;
  phone: string;
  addressLines: string;
  country: string;
  jurisdiction: string;
  /** `site.socials`, as submitted rows. Blank hrefs are dropped. */
  socials: { label: string; href: string }[];
}

/**
 * Saves the store's identity, contact details and socials.
 *
 * ## Why one action for three documents
 *
 * They are one screen and one mental object — "who the studio is and how to reach
 * it" — and splitting them would let an owner half-save a change that reads as a
 * single edit. Each document is still written separately and independently
 * authorised, and a failure on any one aborts before anything is written, so the
 * form cannot half-apply.
 *
 * ## Contact details are validated as details, not as free text
 *
 * An email with no `@`, a phone number with no digits, or a `mailto:`/`tel:` link
 * built from either would publish a broken way to reach the studio on every
 * policy page. These are checked here because this is the only place they are
 * written.
 */
export async function saveStoreSettings(input: StoreSettingsInput): Promise<ContentActionResult> {
  if (!(await assertAdmin())) return UNAUTHORIZED;

  const email = input.email.trim();
  if (email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "That does not look like an email address." };
  }

  const phone = input.phone.trim();
  if (phone.length > 0 && !/[0-9]/.test(phone)) {
    return { ok: false, error: "A phone number needs at least one digit." };
  }

  // Blank rows are how the owner removes a social link, so they are dropped
  // rather than saved as an empty entry.
  const socials = input.socials
    .map((entry) => ({ label: entry.label.trim(), href: entry.href.trim() }))
    .filter((entry) => entry.label.length > 0 && entry.href.length > 0)
    .map((entry, index) => ({
      key: `social-${index + 1}`,
      label: entry.label,
      href: entry.href,
      enabled: true,
    }));

  return saveContentDocuments([
    {
      key: "site.identity",
      value: {
        name: input.name.trim(),
        shortName: input.shortName.trim(),
        tagline: input.tagline.trim(),
        footerTagline: input.footerTagline.trim(),
        mobileTagline: input.mobileTagline.trim(),
        metaTitle: input.metaTitle.trim(),
        metaDescription: input.metaDescription.trim(),
        homeMetaTitle: input.homeMetaTitle.trim(),
        homeMetaDescription: input.homeMetaDescription.trim(),
      },
    },
    {
      key: "site.contact",
      value: {
        email,
        phone,
        addressLines: input.addressLines
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0),
        country: input.country.trim(),
        jurisdiction: input.jurisdiction.trim(),
      },
    },
    { key: "site.socials", value: socials },
  ]);
}
