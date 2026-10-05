/**
 * Storage path rules for the public catalogue images bucket.
 *
 * Pure and dependency-free so the authorization boundary can be unit-tested.
 * Nothing here trusts the browser: object paths are generated server-side, and
 * these predicates are what stop a forged request from pointing an upload,
 * delete or cover change at somebody else's object, at a traversal path, or at
 * a file type the bucket does not accept.
 */

export const IMAGE_BUCKET = "product-images";

// Typed as a plain string list so callers can validate untrusted input with
// `.includes(value)` without a cast.
export const ALLOWED_IMAGE_TYPES: readonly string[] = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/gif",
];

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export const IMAGE_EXTENSION: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/gif": "gif",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OBJECT_FILE_PATTERN = /^[0-9a-f-]{36}\.(png|jpg|webp|heic|gif)$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isScopedObjectPath(path: unknown, prefix: string): path is string {
  if (typeof path !== "string" || path.includes("..") || path.startsWith("/")) return false;
  if (!path.startsWith(prefix)) return false;
  const rest = path.slice(prefix.length);
  // One generated filename only: no nested folders, no second path segment.
  return OBJECT_FILE_PATTERN.test(rest);
}

/** products/<productId>/<uuid>.<ext> */
export function isProductImagePath(path: unknown, productId: string): path is string {
  if (!isUuid(productId)) return false;
  return isScopedObjectPath(path, `products/${productId}/`);
}

/** collections/<collectionId>/<uuid>.<ext> */
export function isCollectionCoverPath(path: unknown, collectionId: string): path is string {
  if (!isUuid(collectionId)) return false;
  return isScopedObjectPath(path, `collections/${collectionId}/`);
}

/* -------------------------------------------------------------------------- */
/* Owner-managed storefront imagery                                            */
/* -------------------------------------------------------------------------- */

/** Public bucket for homepage and other site-wide imagery. */
export const SITE_IMAGE_BUCKET = "site-assets";

/**
 * `site/<contentKey with dots as slashes>/<uuid>.<ext>`
 *
 * Example: `site/home/hero/6f1c….webp` for the `home.hero` document.
 *
 * The content key is folded into the folder structure so every slot owns a
 * distinct directory, which is what makes the scoping check below meaningful: a
 * signed URL for the hero cannot be used to overwrite a gallery tile, and a
 * forged finalize call cannot attach an object belonging to another slot.
 *
 * Keys are validated with the same rule the `site_content` table enforces
 * (`site_content_key_format`), so a key that cannot exist in the table cannot
 * name a folder here either.
 */
const CONTENT_KEY_SEGMENT = /^[a-z][a-zA-Z0-9]*$/;
const CONTENT_KEY_HYPHENATED_SEGMENT = /^[a-zA-Z0-9]+(-[a-zA-Z0-9]+)*$/;

/** True when a string is a well-formed `site_content` key. */
export function isContentKey(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const segments = value.split(".");
  return (
    segments.length >= 1 &&
    CONTENT_KEY_SEGMENT.test(segments[0]) &&
    segments.slice(1).every((segment) => CONTENT_KEY_HYPHENATED_SEGMENT.test(segment))
  );
}

/** The object-path prefix a given content key owns. */
export function siteAssetPrefix(contentKey: string): string {
  return `site/${contentKey.replace(/\./g, "/")}/`;
}

/**
 * True when `path` is exactly one object inside `contentKey`'s folder.
 *
 * Rejects traversal, absolute paths, nested extra folders and a mismatched key —
 * the same shape of check as `isProductImagePath`, for the same reason.
 */
export function isSiteAssetPath(path: unknown, contentKey: string): path is string {
  if (!isContentKey(contentKey)) return false;
  if (typeof path !== "string" || path.includes("..") || path.startsWith("/")) return false;

  const prefix = siteAssetPrefix(contentKey);
  if (!path.startsWith(prefix)) return false;

  // One generated filename only: no second path segment, no nested folders.
  return OBJECT_FILE_PATTERN.test(path.slice(prefix.length));
}
