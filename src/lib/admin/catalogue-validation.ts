import "server-only";

import { STORE_CURRENCY } from "@/lib/currency";

/**
 * The single validation and normalisation layer for catalogue writes.
 *
 * Both write paths go through this module:
 *
 * - the established admin forms (`src/app/admin/actions.ts`), which redirect
 *   back to a page with an error or success query parameter;
 * - Studio Mode (`src/lib/admin/catalogue-actions.ts`), which returns a result
 *   object so the visual editor can show a message without navigating.
 *
 * It exists so the two paths cannot drift: the rules below mirror the database
 * CHECK constraints and the slug unique indexes, and a field that is validated
 * here is validated identically no matter which surface submitted it.
 *
 * Deliberately free of Prisma and of redirects, so it stays unit-testable.
 */

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const PRODUCT_LENGTHS = ["Short", "Medium", "Long"] as const;

export const MAX_NAME_LENGTH = 200;
export const MAX_TITLE_LENGTH = 200;
export const MAX_TAG_LENGTH = 60;
export const MAX_ALT_TEXT_LENGTH = 300;

/** Marker returned by `optionalText` when a value exceeds its column budget. */
const TOO_LONG_PREFIX = "__too_long__:";

export type ProductLength = (typeof PRODUCT_LENGTHS)[number];

/* -------------------------------------------------------------------------- */
/* Field readers                                                              */
/* -------------------------------------------------------------------------- */

/** Reads a trimmed string field from a submitted form. */
export function text(form: FormData, field: string): string {
  const value = form.get(field);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Reads an optional trimmed string, reporting an over-length value rather than
 * silently truncating it. Returns the `__too_long__` marker so the caller can
 * decide how to word the error.
 */
export function optionalText(form: FormData, field: string, max: number): string | null {
  const value = text(form, field);
  if (value.length === 0) return null;
  return value.length > max ? `${TOO_LONG_PREFIX}${max}` : value;
}

export function isTooLong(value: string | null): boolean {
  return typeof value === "string" && value.startsWith(TOO_LONG_PREFIX);
}

/** Same rule as `optionalText`, for callers that already hold a plain value. */
export function normalizeOptionalText(
  value: string | null | undefined,
  max: number,
): { ok: true; value: string | null } | { ok: false; error: string } {
  const trimmed = (value ?? "").trim();
  if (trimmed.length === 0) return { ok: true, value: null };
  if (trimmed.length > max) return { ok: false, error: `That value must be ${max} characters or fewer.` };
  return { ok: true, value: trimmed };
}

/**
 * Parses a display order field. Empty means "no explicit order" (NULL), which
 * the storefront sorts last.
 *
 * Accepts a number as well as a string: the admin form submits text, while the
 * visual editor may already hold a parsed integer.
 */
export function parseDisplayOrder(raw: string | number | null | undefined): number | null | "invalid" {
  if (typeof raw === "number") return Number.isInteger(raw) ? raw : "invalid";
  const trimmed = (raw ?? "").trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  return Number.isInteger(value) ? value : "invalid";
}

/**
 * Parses the price submitted by either surface.
 *
 * The currency is not a parameter and not something a client may state: the
 * store prices in PKR only, so a price that exists is always a PKR price. This
 * is the boundary that makes the database's PKR CHECK constraint unreachable by
 * ordinary writes.
 *
 * An absent price means "no verified price": the storefront shows its
 * placeholder and checkout refuses the product. The database enforces the same
 * pairing — `products_price_currency_pair` — so a half-set price cannot exist.
 */
export function parsePricePair(
  priceRaw: string,
): { ok: true; priceMinor: number | null; currency: string | null } | { ok: false; error: string } {
  const price = priceRaw.trim();

  if (price === "") return { ok: true, priceMinor: null, currency: null };

  const priceMinor = Number(price);
  if (!Number.isInteger(priceMinor) || priceMinor < 0) {
    return {
      ok: false,
      error: "Price must be a whole number of paisa (for example 450000 for PKR 4,500.00).",
    };
  }

  return { ok: true, priceMinor, currency: STORE_CURRENCY };
}

/**
 * Turns a display name into a slug candidate.
 *
 * Pure and shared by both write surfaces: a new product's slug is derived from
 * its name on the server, and the Control Center shows the owner the same
 * candidate so what they see matches what gets stored.
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    // Strip combining marks so "Café" becomes "cafe" rather than losing the e.
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Splits the textarea form of the "included" list into stored lines. */
export function parseIncluded(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/* -------------------------------------------------------------------------- */
/* Product validation                                                         */
/* -------------------------------------------------------------------------- */

export interface ProductCoreInput {
  slug: string;
  name: string;
  descriptor: string;
  description: string;
  shape: string;
  defaultLength: string;
  finish: string;
  /** Already normalised by `optionalText` or `normalizeOptionalText`. */
  tag: string | null;
  displayOrder: number | null | "invalid";
  included: string[];
}

export type ProductCore = Omit<ProductCoreInput, "displayOrder" | "defaultLength"> & {
  defaultLength: ProductLength;
  displayOrder: number | null;
};

/**
 * The catalogue rules a product row must satisfy, in the order a person would
 * want to read them. `slug` is only validated when the caller intends to write
 * it; Studio Mode keeps the existing slug instead.
 */
export function validateProductCore(input: ProductCoreInput): string[] {
  const errors: string[] = [];

  if (input.name.length === 0 || input.name.length > MAX_NAME_LENGTH) {
    errors.push(`Name is required (max ${MAX_NAME_LENGTH} characters).`);
  }
  if (!SLUG_PATTERN.test(input.slug)) {
    errors.push("Slug must be lowercase words separated by single hyphens.");
  }
  if (input.shape.length === 0) errors.push("Shape is required.");
  if (!PRODUCT_LENGTHS.includes(input.defaultLength as ProductLength)) {
    errors.push("Default length must be Short, Medium or Long.");
  }
  if (isTooLong(input.tag)) errors.push("Tag is too long.");
  if (input.displayOrder === "invalid") errors.push("Display order must be a whole number.");

  return errors;
}

/** Narrows validated input once `validateProductCore` has returned no errors. */
export function toProductCore(input: ProductCoreInput): ProductCore {
  return {
    slug: input.slug,
    name: input.name,
    descriptor: input.descriptor,
    description: input.description,
    shape: input.shape,
    defaultLength: input.defaultLength as ProductLength,
    finish: input.finish,
    tag: isTooLong(input.tag) ? null : input.tag,
    displayOrder: input.displayOrder === "invalid" ? null : input.displayOrder,
    included: input.included,
  };
}

/* -------------------------------------------------------------------------- */
/* Collection validation                                                      */
/* -------------------------------------------------------------------------- */

export interface CollectionCoreInput {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  tag: string | null;
  displayOrder: number | null | "invalid";
}

export type CollectionCore = Omit<CollectionCoreInput, "displayOrder"> & {
  displayOrder: number | null;
};

export function validateCollectionCore(input: CollectionCoreInput): string[] {
  const errors: string[] = [];

  if (input.title.length === 0 || input.title.length > MAX_TITLE_LENGTH) {
    errors.push(`Title is required (max ${MAX_TITLE_LENGTH} characters).`);
  }
  if (!SLUG_PATTERN.test(input.slug)) {
    errors.push("Slug must be lowercase words separated by single hyphens.");
  }
  if (isTooLong(input.tag)) errors.push("Tag is too long.");
  if (input.displayOrder === "invalid") errors.push("Display order must be a whole number.");

  return errors;
}

export function toCollectionCore(input: CollectionCoreInput): CollectionCore {
  return {
    slug: input.slug,
    title: input.title,
    subtitle: input.subtitle,
    description: input.description,
    tag: isTooLong(input.tag) ? null : input.tag,
    displayOrder: input.displayOrder === "invalid" ? null : input.displayOrder,
  };
}

/* -------------------------------------------------------------------------- */
/* Database error translation                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Turns a Postgres/Prisma failure into something an owner can act on.
 *
 * Only two flavours are worth distinguishing: a value that collides with a
 * unique index, and everything else. The constraint names are the ones the
 * migrations actually create.
 */
export function describeProductWriteError(message: string): string {
  if (message.includes("products_slug_key")) return "That slug is already used by another product.";
  if (message.includes("products_slug_format")) {
    return "Slug must be lowercase words separated by single hyphens.";
  }
  if (message.includes("products_default_length_valid")) {
    return "Default length must be Short, Medium or Long.";
  }
  if (message.includes("price")) {
    return "The price could not be saved. A price and its currency must be set together.";
  }
  if (message.includes("included")) return "Included items could not be saved.";
  return "The product could not be saved. Please check the values and try again.";
}

export function describeCollectionWriteError(message: string): string {
  if (message.includes("collections_slug_key")) return "That slug is already used by another collection.";
  if (message.includes("collections_slug_format")) {
    return "Slug must be lowercase words separated by single hyphens.";
  }
  return "The collection could not be saved. Please check the values and try again.";
}

/**
 * Extracts a readable message from an unknown thrown value.
 *
 * For classify-and-translate use only: pass the result to
 * {@link describeProductWriteError} / {@link describeCollectionWriteError} or to
 * {@link logServerError}. Never return it to a caller verbatim — a Prisma error
 * string carries table and column names.
 */
export function errorMessage(error: unknown): string {
  return String((error as { message?: string })?.message ?? "");
}

/** A safe, actionable message plus the technical detail, kept server-side. */
export interface SafeFailure {
  /** Wording intended for the UI. Carries no schema, key or connection detail. */
  message: string;
}

/**
 * Records a technical failure server-side and returns wording that is safe to
 * show a person.
 *
 * Write actions used to return `error.message` straight to the client. A Prisma
 * failure there is not a friendly string: it names the model, the column and
 * often the constraint ("Unique constraint failed on the fields: (`slug`)"), and
 * a connection failure can quote the host. The person acting on the form gains
 * nothing from that, and it hands an attacker a map of the schema.
 *
 * Logging stays verbose on purpose — Vercel captures stdout/stderr for the
 * project, so the detail is still available to whoever needs to diagnose it.
 */
export function logServerError(context: string, error: unknown): SafeFailure {
  console.error(`[catalogue] ${context}:`, error);

  return {
    message:
      "That could not be saved because of a problem on our side. " +
      "Nothing was changed — please try again, and tell us if it keeps happening.",
  };
}
