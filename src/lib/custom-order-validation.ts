/**
 * Custom-order validation and object-path rules.
 *
 * Pure and dependency-free (no Prisma, no Supabase, no `server-only`) so the
 * same rules run on the server as the authority *and* can be unit-tested
 * without a database or network.
 *
 * Everything here is derived from what the existing UI already declares:
 *   - required fields and option ids: src/components/custom/CustomOrderForm.tsx
 *     + src/data/custom-order.ts
 *   - reference limits: ReferenceUploader.tsx (`maxFiles={6}`, 10 MB default,
 *     accept="image/png,image/jpeg,image/webp,image/heic,image/gif")
 * The database CHECK constraints in 20261004130722_custom_orders.sql mirror
 * these numbers; the mirroring is intentional (defence in depth).
 */

import { AVAILABLE_LENGTHS, AVAILABLE_SHAPES, AVAILABLE_SIZING_OPTIONS } from "@/data/custom-order";

export const REFERENCE_BUCKET = "custom-order-references";

/** Path prefix inside the bucket; also the scope key for authorization. */
export const OBJECT_PREFIX = REFERENCE_BUCKET;

export const MAX_REFERENCE_FILES = 6;
export const MAX_REFERENCE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_REFERENCE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/gif",
] as const;

export type AllowedReferenceType = (typeof ALLOWED_REFERENCE_TYPES)[number];

/** Field caps, mirroring the database CHECK constraints. */
export const FIELD_LIMITS = {
  name: 120,
  email: 254,
  instagram: 120,
  conceptDescription: 4000,
  customMeasurements: 500,
  colorPalette: 500,
  eventDate: 200,
  budgetGuidance: 200,
  additionalNotes: 2000,
} as const;

export const SHAPE_IDS = AVAILABLE_SHAPES.map((shape) => shape.id);
export const LENGTH_IDS = AVAILABLE_LENGTHS.map((length) => length.id);
export const SIZING_PREFERENCE_IDS = AVAILABLE_SIZING_OPTIONS.map((option) => option.id);
export const STANDARD_SIZES = ["XS", "S", "M", "L"] as const;

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OBJECT_FILE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp|heic|gif)$/i;

const EXTENSION_BY_TYPE: Record<AllowedReferenceType, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/gif": "gif",
};

export type SizingPreference = "kit_first" | "standard" | "custom_measurements";

export interface NormalizedCustomOrder {
  name: string;
  email: string;
  instagram: string | null;
  shape: string;
  length: string;
  sizingPreference: SizingPreference;
  standardSize: string | null;
  customMeasurements: string | null;
  colorPalette: string | null;
  conceptDescription: string;
  eventDate: string | null;
  budgetGuidance: string | null;
  additionalNotes: string | null;
}

export interface ReferenceFileDescriptor {
  filename: string;
  contentType: AllowedReferenceType;
  sizeBytes: number;
}

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string> };

/* -------------------------------------------------------------------------- */
/* Input helpers                                                               */
/* -------------------------------------------------------------------------- */

function asRecord(raw: unknown): Record<string, unknown> {
  return typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
}

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(
  value: unknown,
  limit: number,
  field: string,
  errors: Record<string, string>,
): string | null {
  const text = readText(value);
  if (text.length === 0) return null;
  if (text.length > limit) {
    errors[field] = `Please keep this under ${limit} characters.`;
    return null;
  }
  return text;
}

export function isValidSubmissionToken(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

/* -------------------------------------------------------------------------- */
/* Form validation (server authority)                                          */
/* -------------------------------------------------------------------------- */

export function validateCustomOrderInput(raw: unknown): ValidationResult<NormalizedCustomOrder> {
  const input = asRecord(raw);
  const errors: Record<string, string> = {};

  const name = readText(input.name);
  if (!name) errors.name = "Please enter your name";
  else if (name.length > FIELD_LIMITS.name) errors.name = "Please enter a shorter name";

  const email = readText(input.email);
  if (!email) errors.email = "Please enter your email address";
  else if (email.length > FIELD_LIMITS.email || !EMAIL_PATTERN.test(email)) {
    errors.email = "Please enter a valid email address";
  }

  const conceptDescription = readText(input.conceptDescription);
  if (!conceptDescription) {
    errors.conceptDescription = "Please provide a brief description of your design concept";
  } else if (conceptDescription.length > FIELD_LIMITS.conceptDescription) {
    errors.conceptDescription = `Please keep your description under ${FIELD_LIMITS.conceptDescription} characters.`;
  }

  // Option ids are validated against the lists the UI renders from.
  const shape = readText(input.shape);
  if (!SHAPE_IDS.includes(shape)) errors.shape = "Please choose a nail shape";

  const length = readText(input.length);
  if (!LENGTH_IDS.includes(length)) errors.length = "Please choose a nail length";

  const sizingPreference = readText(input.sizingPreference);
  if (!SIZING_PREFERENCE_IDS.includes(sizingPreference)) {
    errors.sizingPreference = "Please choose a sizing option";
  }

  // Normalise the conditional sizing fields: the UI keeps a default
  // standardSize of "M" even when another option is selected, so only the value
  // that belongs to the chosen option is kept. This mirrors the
  // custom_order_requests_sizing_coherent constraint.
  let standardSize: string | null = null;
  let customMeasurements: string | null = null;
  if (sizingPreference === "standard") {
    const candidate = readText(input.standardSize);
    if (!STANDARD_SIZES.includes(candidate as (typeof STANDARD_SIZES)[number])) {
      errors.standardSize = "Please choose a preset size";
    } else {
      standardSize = candidate;
    }
  } else if (sizingPreference === "custom_measurements") {
    customMeasurements = optionalText(
      input.customMeasurements,
      FIELD_LIMITS.customMeasurements,
      "customMeasurements",
      errors,
    );
  }

  const instagram = optionalText(input.instagram, FIELD_LIMITS.instagram, "instagram", errors);
  const colorPalette = optionalText(input.colorPalette, FIELD_LIMITS.colorPalette, "colorPalette", errors);
  const eventDate = optionalText(input.eventDate, FIELD_LIMITS.eventDate, "eventDate", errors);
  const budgetGuidance = optionalText(input.budgetGuidance, FIELD_LIMITS.budgetGuidance, "budgetGuidance", errors);
  const additionalNotes = optionalText(input.additionalNotes, FIELD_LIMITS.additionalNotes, "additionalNotes", errors);

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      name,
      email,
      instagram,
      shape,
      length,
      sizingPreference: sizingPreference as SizingPreference,
      standardSize,
      customMeasurements,
      colorPalette,
      conceptDescription,
      eventDate,
      budgetGuidance,
      additionalNotes,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Reference upload validation                                                 */
/* -------------------------------------------------------------------------- */

export function sanitizeFilename(name: unknown): string {
  const raw = typeof name === "string" ? name : "reference";
  // Drop any directory component and control characters; keep a printable name
  // for the studio's reference list. The stored object path never uses it.
  const flattened = raw.split(/[\\/]/).pop() ?? "reference";
  const printable = flattened.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return (printable || "reference").slice(0, 255);
}

export function extensionForType(contentType: AllowedReferenceType): string {
  return EXTENSION_BY_TYPE[contentType];
}

export function validateReferenceFiles(raw: unknown): ValidationResult<ReferenceFileDescriptor[]> {
  if (raw === undefined || raw === null) return { ok: true, data: [] };
  if (!Array.isArray(raw)) return { ok: false, errors: { files: "Unexpected upload payload." } };

  if (raw.length > MAX_REFERENCE_FILES) {
    return {
      ok: false,
      errors: { files: `You can upload up to ${MAX_REFERENCE_FILES} reference images in total.` },
    };
  }

  const files: ReferenceFileDescriptor[] = [];
  for (const entry of raw) {
    const file = asRecord(entry);
    const contentType = readText(file.contentType).toLowerCase();
    const sizeBytes = typeof file.sizeBytes === "number" ? file.sizeBytes : Number.NaN;
    const filename = sanitizeFilename(file.filename);

    if (!ALLOWED_REFERENCE_TYPES.includes(contentType as AllowedReferenceType)) {
      return {
        ok: false,
        errors: { files: `"${filename}" is not a supported image file (PNG, JPG, WebP, HEIC or GIF).` },
      };
    }
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_REFERENCE_BYTES) {
      return {
        ok: false,
        errors: { files: `"${filename}" is larger than the 10 MB limit.` },
      };
    }

    files.push({ filename, contentType: contentType as AllowedReferenceType, sizeBytes });
  }

  return { ok: true, data: files };
}

/* -------------------------------------------------------------------------- */
/* Object path rules (authorization boundary)                                  */
/* -------------------------------------------------------------------------- */

/**
 * Builds an unpredictable, submission-scoped object path:
 *   custom-order-references/<submissionToken>/<randomObjectId>.<ext>
 * The client never chooses any part of it, so it cannot target another
 * submission's folder or overwrite an existing object.
 */
export function buildReferencePath(
  submissionToken: string,
  objectId: string,
  contentType: AllowedReferenceType,
): string {
  if (!isValidSubmissionToken(submissionToken) || !isValidSubmissionToken(objectId)) {
    throw new Error("Refusing to build a reference path from a malformed identifier.");
  }
  return `${OBJECT_PREFIX}/${submissionToken}/${objectId}.${extensionForType(contentType)}`;
}

/**
 * True only for paths that live inside this submission's own folder and have
 * the expected object shape. Rejects other submissions, traversal attempts,
 * absolute paths and unexpected extensions.
 */
export function isReferencePathInScope(path: unknown, submissionToken: unknown): boolean {
  if (typeof path !== "string" || !isValidSubmissionToken(submissionToken)) return false;
  if (path.includes("..") || path.startsWith("/")) return false;

  const prefix = `${OBJECT_PREFIX}/${submissionToken}/`;
  if (!path.startsWith(prefix)) return false;

  return OBJECT_FILE_PATTERN.test(path.slice(prefix.length));
}
