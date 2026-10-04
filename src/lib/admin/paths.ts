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
