"use server";

import { revalidatePath } from "next/cache";

import { getAdminUser } from "@/lib/admin/auth";
import {
  ALLOWED_IMAGE_TYPES,
  IMAGE_BUCKET,
  IMAGE_EXTENSION,
  MAX_IMAGE_BYTES,
  isCollectionCoverPath,
  isProductImagePath,
  isUuid,
} from "@/lib/admin/paths";
import {
  MAX_ALT_TEXT_LENGTH,
  MAX_NAME_LENGTH,
  MAX_TAG_LENGTH,
  describeProductWriteError,
  errorMessage,
  logServerError,
  normalizeOptionalText,
  parseDisplayOrder,
  parsePricePair,
  toProductCore,
  validateProductCore,
} from "@/lib/admin/catalogue-validation";
import type {
  StudioCollectionSaveInput,
  StudioProductSaveInput,
  StudioResult,
  StudioUploadTarget,
} from "@/lib/admin/studio-action-types";
import { loadStudioManagement, type StudioManagement } from "@/lib/admin/studio-management";
import {
  VersionMismatchError,
  guardedUpdateCollection,
  guardedUpdateProduct,
  isVersionToken,
} from "@/lib/admin/version-token";
import { getPrisma } from "@/lib/prisma/db";
import { guardRateLimit } from "@/lib/security/rate-limit-guard";
import { getReferenceStorage } from "@/lib/supabase/admin";

/**
 * The write surface Studio Mode uses.
 *
 * ## Why this exists alongside `src/app/admin/actions.ts`
 *
 * The established admin actions are form actions: they take `FormData` and end
 * in `redirect()`, which is exactly right for a progressively-enhanced `<form>`
 * and exactly wrong for the visual editor, which must stay on the page and show
 * an inline message. Rather than fork the rules, both surfaces call the same
 * validators in `@/lib/admin/catalogue-validation`, and the storage path/MIME/
 * size rules in `@/lib/admin/paths`. There is one implementation of each rule;
 * only the delivery of the outcome differs.
 *
 * ## Every action authorises independently
 *
 * `assertAdmin()` runs first in every exported action. Nothing here trusts the
 * UI, the proxy or a previously successful call in the same session: a forged
 * invocation from a non-admin gets `unauthorized` and no side effect.
 *
 * ## Optimistic concurrency
 *
 * Saves carry the `updatedAt` the editor loaded. The UPDATE filters on both the
 * id and that timestamp, so a row changed by another tab or another admin since
 * the draft was based on it no longer matches. The database applies the
 * predicate and the row lock in one statement, which is what makes the check
 * race-free without a transaction of our own. A mismatch is reported as
 * `conflict` together with the current server state, so the editor can rebase
 * instead of silently overwriting.
 */

const UNAUTHORIZED = { ok: false as const, kind: "unauthorized" as const, error: "Not authorised." };

/**
 * Maps a safe failure onto the action result shape.
 *
 * `logServerError` deliberately names its field `message` so the wording reads as
 * a sentence rather than an error code; the result contract uses `error`, so the
 * rename happens here exactly once.
 */
function asStudioError(failure: { message: string }): { error: string } {
  return { error: failure.message };
}

async function assertAdmin(): Promise<boolean> {
  return (await getAdminUser()) !== null;
}

/** Revalidates every storefront surface a catalogue change can appear on. */
function revalidateCatalogue(productSlug?: string) {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/collections");
  revalidatePath("/search");
  if (productSlug) revalidatePath(`/product/${productSlug}`);
}

/* -------------------------------------------------------------------------- */
/* Reading the management state                                                */
/* -------------------------------------------------------------------------- */

/**
 * Supplies the authoritative admin-only values the editors need.
 *
 * Called when an admin enters Studio Mode, not during a customer page render, so
 * management metadata is never part of a visitor's response.
 */
export async function loadStudioState(): Promise<
  { ok: true; state: StudioManagement } | { ok: false; error: string }
> {
  if (!(await assertAdmin())) return { ok: false, error: "Not authorised." };

  try {
    return { ok: true, state: await loadStudioManagement() };
  } catch {
    return { ok: false, error: "The catalogue could not be read. Please reload." };
  }
}

/* -------------------------------------------------------------------------- */
/* Product save                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Saves the whole editable product in one statement.
 *
 * Price, visibility and text are written together because the editor presents
 * them as one form and because a single UPDATE keeps the concurrency check to
 * one atomic operation. Splitting it would allow a partial save, which the owner
 * would have no way to see.
 *
 * `slug` is intentionally not editable from Studio Mode: the existing slug is
 * reused, so a storefront URL cannot be broken by an in-place edit. Slugs remain
 * editable from the admin product form.
 */
export async function saveStudioProduct(
  input: StudioProductSaveInput,
): Promise<StudioResult<{ productId: string }>> {
  if (!(await assertAdmin())) return UNAUTHORIZED;
  if (!isUuid(input.id)) return { ok: false, kind: "not_found", error: "Unknown product." };

  if (!isVersionToken(input.expectedUpdatedAt)) {
    return { ok: false, kind: "invalid", error: "This editor is out of date. Please reload the page." };
  }

  const tag = normalizeOptionalText(input.tag, MAX_TAG_LENGTH);
  if (!tag.ok) return { ok: false, kind: "invalid", error: tag.error };

  const priceInput = input.price.trim();
  const parsedPrice = parsePricePair(
    priceInput === "" ? "" : priceToMinorUnits(priceInput),
    priceInput === "" ? "" : input.currency,
  );
  if (!parsedPrice.ok) return { ok: false, kind: "invalid", error: parsedPrice.error };

  const prisma = getPrisma();
  const current = await prisma.products.findUnique({
    where: { id: input.id },
    select: { slug: true },
  });
  if (!current) return { ok: false, kind: "not_found", error: "That product no longer exists." };

  const raw = {
    // Reuse the stored slug: it is not part of this editor.
    slug: current.slug,
    name: input.name.trim().slice(0, MAX_NAME_LENGTH),
    descriptor: input.descriptor.trim(),
    description: input.description.trim(),
    shape: input.shape.trim(),
    defaultLength: input.defaultLength,
    finish: input.finish.trim(),
    tag: tag.value,
    displayOrder: parseDisplayOrder(input.displayOrder),
    included: input.included
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0),
  };

  const errors = validateProductCore(raw);
  if (errors.length > 0) return { ok: false, kind: "invalid", error: errors.join(" ") };

  const core = toProductCore(raw);

  try {
    // One statement: the version predicate and the write are applied together,
    // so a competing save cannot slip between the check and the update.
    await guardedUpdateProduct(input.id, input.expectedUpdatedAt, {
      name: core.name,
      descriptor: core.descriptor,
      description: core.description,
      shape: core.shape,
      default_length: core.defaultLength,
      finish: core.finish,
      tag: core.tag,
      display_order: core.displayOrder,
      included: core.included,
      price_minor: parsedPrice.priceMinor,
      currency: parsedPrice.currency,
      is_active: input.isActive,
      featured: input.featured,
    });
  } catch (error) {
    if (error instanceof VersionMismatchError) {
      return {
        ok: false,
        kind: "conflict",
        error:
          "This product changed elsewhere since you opened the editor. Your edits were not saved — reload to see the current values.",
        state: await loadStudioManagement(),
      };
    }
    return {
      ok: false,
      kind: "error",
      error: describeProductWriteError(errorMessage(error)),
    };
  }

  revalidateCatalogue(current.slug);
  return { ok: true, kind: "saved", state: await loadStudioManagement(), data: { productId: input.id } };
}

/**
 * Converts a formatted price into the whole minor-unit string the shared price
 * parser expects.
 *
 * Studio accepts "$45", "45.00" and "45"; the database stores minor units, and
 * the admin form already submits minor units directly. Rounding here (rather
 * than in the parser) keeps the stored value the exact integer the CHECK
 * constraint requires.
 */
function priceToMinorUnits(value: string): string {
  const cleaned = value.replace(/^[A-Za-z]{3}\s*/, "").replace(/[^0-9.]/g, "");
  const amount = Number.parseFloat(cleaned);
  if (!Number.isFinite(amount) || amount < 0) return value;
  return String(Math.round(amount * 100));
}

/* -------------------------------------------------------------------------- */
/* Collection save                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Saves the editable collection fields.
 *
 * The cover is handled separately (it is an upload, not a text field); slug and
 * cover are left untouched here so this call cannot orphan a Storage object or
 * break a URL.
 */
export async function saveStudioCollection(
  input: StudioCollectionSaveInput,
): Promise<StudioResult<{ collectionId: string }>> {
  if (!(await assertAdmin())) return UNAUTHORIZED;
  if (!isUuid(input.id)) return { ok: false, kind: "not_found", error: "Unknown collection." };

  if (!isVersionToken(input.expectedUpdatedAt)) {
    return { ok: false, kind: "invalid", error: "This editor is out of date. Please reload the page." };
  }

  const tag = normalizeOptionalText(input.tag, MAX_TAG_LENGTH);
  if (!tag.ok) return { ok: false, kind: "invalid", error: tag.error };

  const displayOrder = parseDisplayOrder(input.displayOrder);
  if (displayOrder === "invalid") {
    return { ok: false, kind: "invalid", error: "Display order must be a whole number." };
  }

  const title = input.title.trim();
  if (title.length === 0) return { ok: false, kind: "invalid", error: "Collection title is required." };

  try {
    await guardedUpdateCollection(input.id, input.expectedUpdatedAt, {
      title,
      subtitle: input.subtitle.trim(),
      description: input.description.trim(),
      tag: tag.value,
      is_active: input.isActive,
      featured: input.featured,
      display_order: displayOrder,
    });
  } catch (error) {
    if (error instanceof VersionMismatchError) {
      return {
        ok: false,
        kind: "conflict",
        error:
          "This collection changed elsewhere since you opened the editor. Your edits were not saved — reload to see the current values.",
        state: await loadStudioManagement(),
      };
    }
    return { ok: false, kind: "error", ...asStudioError(logServerError("saveStudioCollection", error)) };
  }

  revalidateCatalogue();
  return {
    ok: true,
    kind: "saved",
    state: await loadStudioManagement(),
    data: { collectionId: input.id },
  };
}

/* -------------------------------------------------------------------------- */
/* Product images                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Mints one short-lived signed upload URL for a new product photograph.
 *
 * Mirrors the admin uploader's `prepareProductImageUpload` exactly — same MIME
 * allowlist, same 10 MB ceiling, same server-generated path under the product's
 * own folder — and adds the two facts Studio needs to place the image: the
 * resulting `sort_order` and whether it will be the primary one.
 */
export async function prepareStudioImageUpload(input: {
  productId: string;
  contentType: string;
  sizeBytes: number;
  /** When replacing, the image being superseded; the new one takes its place. */
  replacingImageId?: string;
}): Promise<StudioUploadTarget> {
  if (!(await assertAdmin())) return { ok: false, error: "Not authorised." };

  const limit = await guardRateLimit("adminUpload");
  if (!limit.allowed) return { ok: false, error: limit.message };

  if (!isUuid(input.productId)) return { ok: false, error: "Unknown product." };
  if (!ALLOWED_IMAGE_TYPES.includes(input.contentType)) {
    return { ok: false, error: "Unsupported image type. Use PNG, JPG, WebP, HEIC or GIF." };
  }
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Images must be 10 MB or smaller." };
  }

  const prisma = getPrisma();
  const product = await prisma.products.findUnique({
    where: { id: input.productId },
    select: { id: true },
  });
  if (!product) return { ok: false, error: "Unknown product." };

  // The path is generated here, never by the browser: a client cannot choose a
  // path, overwrite an existing object, or write outside its product folder.
  const path = `products/${product.id}/${crypto.randomUUID()}.${IMAGE_EXTENSION[input.contentType]}`;
  const { data, error } = await getReferenceStorage()
    .from(IMAGE_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) return { ok: false, error: "Could not prepare the upload. Please try again." };

  return { ok: true, path, token: data.token, signedUrl: data.signedUrl };
}

/**
 * Records the metadata row once the object is confirmed to exist in Storage.
 *
 * The object's real content type and byte size are read back from Storage rather
 * than trusted from the request, so a mislabelled file cannot become a catalogue
 * image. `replacingImageId` places the new row where the old one sat and then
 * removes the superseded row and its object, which is what makes "replace" a
 * single action for the owner.
 */
export async function finalizeStudioImageUpload(input: {
  productId: string;
  path: string;
  altText?: string;
  replacingImageId?: string;
}): Promise<StudioResult<{ imageId: string }>> {
  if (!(await assertAdmin())) return UNAUTHORIZED;
  if (!isProductImagePath(input.path, input.productId)) {
    return { ok: false, kind: "invalid", error: "That image path is not valid for this product." };
  }

  const prisma = getPrisma();
  const storage = getReferenceStorage();

  const { data: info, error } = await storage.from(IMAGE_BUCKET).info(input.path);
  if (error || !info) {
    return { ok: false, kind: "error", error: "The upload did not complete. Please try again." };
  }
  if (!ALLOWED_IMAGE_TYPES.includes(info.contentType as string)) {
    // Reject and clean up: a disallowed object must not stay in the bucket.
    await storage.from(IMAGE_BUCKET).remove([input.path]);
    return { ok: false, kind: "invalid", error: "Unsupported image type." };
  }
  const size = info.size ?? 0;
  if (size <= 0 || size > MAX_IMAGE_BYTES) {
    await storage.from(IMAGE_BUCKET).remove([input.path]);
    return { ok: false, kind: "invalid", error: "Images must be 10 MB or smaller." };
  }

  const replaced =
    input.replacingImageId && isUuid(input.replacingImageId)
      ? await prisma.product_images.findFirst({
          where: { id: input.replacingImageId, product_id: input.productId },
          select: { id: true, storage_path: true, sort_order: true, is_primary: true },
        })
      : null;

  const imageCount = await prisma.product_images.count({ where: { product_id: input.productId } });

  /**
   * Retire the incumbent's cover flag before inserting its replacement.
   *
   * `product_images_one_primary_per_product` is a partial UNIQUE index on
   * `(product_id) WHERE is_primary`, and the replacement inherits the flag. The
   * insert would therefore collide with the row it is superseding, so the flag is
   * released first — the replacement is the only primary image for the gap
   * between these two statements.
   */
  if (replaced?.is_primary) {
    await prisma.product_images.update({
      where: { id: replaced.id },
      data: { is_primary: false },
    });
  }

  let created;
  try {
    created = await prisma.product_images.create({
      data: {
        product_id: input.productId,
        storage_path: input.path,
        alt_text: (input.altText ?? "").slice(0, MAX_ALT_TEXT_LENGTH),
        sort_order: replaced ? replaced.sort_order : await nextSortOrder(input.productId),
        // The first photograph of a product is its cover; a replacement inherits
        // the position (and cover flag) of the image it supersedes.
        is_primary: replaced ? replaced.is_primary : imageCount === 0,
      },
      select: { id: true },
    });
  } catch (error) {
    // Do not leave the uploaded object behind if the row cannot be written.
    await storage.from(IMAGE_BUCKET).remove([input.path]);
    return { ok: false, kind: "error", ...asStudioError(logServerError("finalizeStudioImageUpload", error)) };
  }

  if (replaced) {
    await prisma.product_images.delete({ where: { id: replaced.id } }).catch(() => undefined);
    if (isProductImagePath(replaced.storage_path, input.productId)) {
      await storage.from(IMAGE_BUCKET).remove([replaced.storage_path]);
    }
  }

  return {
    ok: true,
    kind: "saved",
    state: await loadStudioManagement(),
    data: { imageId: created.id },
  };
}

/** The next free position at the end of a product's gallery. */
async function nextSortOrder(productId: string): Promise<number> {
  const max = await getPrisma().product_images.aggregate({
    where: { product_id: productId },
    _max: { sort_order: true },
  });
  return (max._max.sort_order ?? -1) + 1;
}

/**
 * Rewrites a product's gallery into exactly the given order.
 *
 * The editor already holds the desired order, so it sends it whole; the server
 * verifies that the ids are a permutation of *this product's* images before
 * writing, which is what stops a forged id from reordering someone else's rows.
 * The first image in the list becomes the cover.
 */
export async function reorderStudioImages(input: {
  productId: string;
  imageIds: string[];
}): Promise<StudioResult<Record<string, never>>> {
  if (!(await assertAdmin())) return UNAUTHORIZED;
  if (!isUuid(input.productId)) return { ok: false, kind: "not_found", error: "Unknown product." };
  if (input.imageIds.some((id) => !isUuid(id))) {
    return { ok: false, kind: "invalid", error: "That gallery order is not valid." };
  }

  const prisma = getPrisma();
  const existing = await prisma.product_images.findMany({
    where: { product_id: input.productId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((row) => row.id));
  const incoming = new Set(input.imageIds);

  if (existingIds.size !== incoming.size || [...existingIds].some((id) => !incoming.has(id))) {
    return {
      ok: false,
      kind: "conflict",
      error: "The gallery changed elsewhere. Reload to see the current photographs.",
      state: await loadStudioManagement(),
    };
  }

  try {
    await prisma.$transaction([
      /**
       * Clear the cover flag across the gallery first.
       *
       * `product_images_one_primary_per_product` is a partial UNIQUE index on
       * `(product_id) WHERE is_primary`, so setting a new primary while the old
       * one still holds the flag violates it — even inside a transaction, because
       * the constraint is checked per statement. Splitting the write into
       * "clear, then position" is what makes a reorder legal.
       */
      prisma.product_images.updateMany({
        where: { product_id: input.productId },
        data: { is_primary: false },
      }),
      ...input.imageIds.map((id, position) =>
        prisma.product_images.update({
          where: { id },
          data: { sort_order: position, is_primary: position === 0 },
        }),
      ),
    ]);
  } catch (error) {
    return { ok: false, kind: "error", ...asStudioError(logServerError("reorderStudioImages", error)) };
  }

  return { ok: true, kind: "saved", state: await loadStudioManagement(), data: {} };
}

/** Promotes one image to the product's cover without changing the order. */
export async function setStudioPrimaryImage(input: {
  productId: string;
  imageId: string;
}): Promise<StudioResult<Record<string, never>>> {
  if (!(await assertAdmin())) return UNAUTHORIZED;
  if (!isUuid(input.productId) || !isUuid(input.imageId)) {
    return { ok: false, kind: "invalid", error: "That photograph is not valid." };
  }

  const prisma = getPrisma();
  const image = await prisma.product_images.findFirst({
    where: { id: input.imageId, product_id: input.productId },
    select: { id: true },
  });
  if (!image) return { ok: false, kind: "not_found", error: "That photograph no longer exists." };

  try {
    // Cleared first: the partial unique index allows only one primary per
    // product, so the flag has to come off the incumbent before it moves.
    await prisma.$transaction([
      prisma.product_images.updateMany({
        where: { product_id: input.productId },
        data: { is_primary: false },
      }),
      prisma.product_images.update({ where: { id: input.imageId }, data: { is_primary: true } }),
    ]);
  } catch (error) {
    return { ok: false, kind: "error", ...asStudioError(logServerError("setStudioPrimaryImage", error)) };
  }

  return { ok: true, kind: "saved", state: await loadStudioManagement(), data: {} };
}

export async function updateStudioImageAlt(input: {
  productId: string;
  imageId: string;
  altText: string;
}): Promise<StudioResult<Record<string, never>>> {
  if (!(await assertAdmin())) return UNAUTHORIZED;
  if (!isUuid(input.productId) || !isUuid(input.imageId)) {
    return { ok: false, kind: "invalid", error: "That photograph is not valid." };
  }

  const prisma = getPrisma();
  const image = await prisma.product_images.findFirst({
    where: { id: input.imageId, product_id: input.productId },
    select: { id: true },
  });
  if (!image) return { ok: false, kind: "not_found", error: "That photograph no longer exists." };

  try {
    await prisma.product_images.update({
      where: { id: input.imageId },
      data: { alt_text: input.altText.slice(0, MAX_ALT_TEXT_LENGTH) },
    });
  } catch (error) {
    return { ok: false, kind: "error", ...asStudioError(logServerError("updateStudioImageAlt", error)) };
  }

  return { ok: true, kind: "saved", state: await loadStudioManagement(), data: {} };
}

/**
 * Removes a photograph and its Storage object.
 *
 * The row is deleted first. If the object removal then fails the row is already
 * gone, so the owner sees the gallery they expect and the leftover object is
 * unreachable rather than shown; the reverse order would leave a row pointing at
 * a missing object.
 *
 * When the cover is removed, the next image in sort order is promoted so the
 * product always has exactly one cover while any photograph remains.
 */
export async function deleteStudioImage(input: {
  productId: string;
  imageId: string;
}): Promise<StudioResult<Record<string, never>>> {
  if (!(await assertAdmin())) return UNAUTHORIZED;
  if (!isUuid(input.productId) || !isUuid(input.imageId)) {
    return { ok: false, kind: "invalid", error: "That photograph is not valid." };
  }

  const prisma = getPrisma();
  const image = await prisma.product_images.findFirst({
    where: { id: input.imageId, product_id: input.productId },
    select: { id: true, storage_path: true, is_primary: true },
  });
  if (!image) return { ok: false, kind: "not_found", error: "That photograph no longer exists." };

  try {
    await prisma.product_images.delete({ where: { id: image.id } });

    if (image.is_primary) {
      const next = await prisma.product_images.findFirst({
        where: { product_id: input.productId },
        orderBy: [{ sort_order: "asc" }, { id: "asc" }],
        select: { id: true },
      });
      if (next) {
        await prisma.product_images.update({ where: { id: next.id }, data: { is_primary: true } });
      }
    }
  } catch (error) {
    return { ok: false, kind: "error", ...asStudioError(logServerError("deleteStudioImage", error)) };
  }

  // Scoped by path rule, so a forged row could never direct this at another
  // product's folder even if it somehow held this product's id.
  if (isProductImagePath(image.storage_path, input.productId)) {
    await getReferenceStorage().from(IMAGE_BUCKET).remove([image.storage_path]).catch(() => undefined);
  }

  return { ok: true, kind: "saved", state: await loadStudioManagement(), data: {} };
}

/* -------------------------------------------------------------------------- */
/* Collection cover                                                            */
/* -------------------------------------------------------------------------- */

/** Signed upload target for a collection cover, scoped to that collection. */
export async function prepareStudioCoverUpload(input: {
  collectionId: string;
  contentType: string;
  sizeBytes: number;
}): Promise<StudioUploadTarget> {
  if (!(await assertAdmin())) return { ok: false, error: "Not authorised." };

  const limit = await guardRateLimit("adminUpload");
  if (!limit.allowed) return { ok: false, error: limit.message };

  if (!isUuid(input.collectionId)) return { ok: false, error: "Unknown collection." };
  if (!ALLOWED_IMAGE_TYPES.includes(input.contentType)) {
    return { ok: false, error: "Unsupported image type. Use PNG, JPG, WebP, HEIC or GIF." };
  }
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Images must be 10 MB or smaller." };
  }

  const collection = await getPrisma().collections.findUnique({
    where: { id: input.collectionId },
    select: { id: true },
  });
  if (!collection) return { ok: false, error: "Unknown collection." };

  const path = `collections/${collection.id}/${crypto.randomUUID()}.${IMAGE_EXTENSION[input.contentType]}`;
  const { data, error } = await getReferenceStorage()
    .from(IMAGE_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "Could not prepare the upload. Please try again." };

  return { ok: true, path, token: data.token, signedUrl: data.signedUrl };
}

/**
 * Points the collection at the uploaded cover and drops the previous object.
 *
 * Replacing rather than accumulating is the existing admin behaviour and is kept
 * here: a collection has one cover, so the object it superseded is removed once
 * the database no longer references it.
 */
export async function finalizeStudioCoverUpload(input: {
  collectionId: string;
  path: string;
  expectedUpdatedAt: string;
}): Promise<StudioResult<Record<string, never>>> {
  if (!(await assertAdmin())) return UNAUTHORIZED;
  if (!isCollectionCoverPath(input.path, input.collectionId)) {
    return { ok: false, kind: "invalid", error: "That image path is not valid for this collection." };
  }

  if (!isVersionToken(input.expectedUpdatedAt)) {
    return { ok: false, kind: "invalid", error: "This editor is out of date. Please reload the page." };
  }

  const prisma = getPrisma();
  const storage = getReferenceStorage();

  const { data: info, error } = await storage.from(IMAGE_BUCKET).info(input.path);
  if (error || !info) return { ok: false, kind: "error", error: "The upload did not complete. Please try again." };
  if (!ALLOWED_IMAGE_TYPES.includes(info.contentType as string)) {
    await storage.from(IMAGE_BUCKET).remove([input.path]);
    return { ok: false, kind: "invalid", error: "Unsupported image type." };
  }
  const size = info.size ?? 0;
  if (size <= 0 || size > MAX_IMAGE_BYTES) {
    await storage.from(IMAGE_BUCKET).remove([input.path]);
    return { ok: false, kind: "invalid", error: "Images must be 10 MB or smaller." };
  }

  const previous = await prisma.collections.findUnique({
    where: { id: input.collectionId },
    select: { cover_image_path: true },
  });

  try {
    await guardedUpdateCollection(input.collectionId, input.expectedUpdatedAt, {
      cover_image_path: input.path,
    });
  } catch (error) {
    // Never orphan the object we just uploaded, whatever the reason.
    await storage.from(IMAGE_BUCKET).remove([input.path]);
    if (error instanceof VersionMismatchError) {
      return {
        ok: false,
        kind: "conflict",
        error:
          "This collection changed elsewhere since you opened the editor. The new cover was not applied — reload and try again.",
        state: await loadStudioManagement(),
      };
    }
    return { ok: false, kind: "error", ...asStudioError(logServerError("finalizeStudioCoverUpload", error)) };
  }

  if (
    previous?.cover_image_path &&
    previous.cover_image_path !== input.path &&
    isCollectionCoverPath(previous.cover_image_path, input.collectionId)
  ) {
    await storage.from(IMAGE_BUCKET).remove([previous.cover_image_path]).catch(() => undefined);
  }

  revalidateCatalogue();
  return { ok: true, kind: "saved", state: await loadStudioManagement(), data: {} };
}

/** Removes the cover object (when it is ours) and clears the column. */
export async function removeStudioCover(input: {
  collectionId: string;
  expectedUpdatedAt: string;
}): Promise<StudioResult<Record<string, never>>> {
  if (!(await assertAdmin())) return UNAUTHORIZED;
  if (!isUuid(input.collectionId)) return { ok: false, kind: "not_found", error: "Unknown collection." };

  if (!isVersionToken(input.expectedUpdatedAt)) {
    return { ok: false, kind: "invalid", error: "This editor is out of date. Please reload the page." };
  }

  const prisma = getPrisma();
  const collection = await prisma.collections.findUnique({
    where: { id: input.collectionId },
    select: { cover_image_path: true },
  });
  if (!collection) return { ok: false, kind: "not_found", error: "That collection no longer exists." };

  try {
    await guardedUpdateCollection(input.collectionId, input.expectedUpdatedAt, {
      cover_image_path: null,
    });
  } catch (error) {
    if (error instanceof VersionMismatchError) {
      return {
        ok: false,
        kind: "conflict",
        error:
          "This collection changed elsewhere since you opened the editor. The cover was not removed — reload and try again.",
        state: await loadStudioManagement(),
      };
    }
    return { ok: false, kind: "error", ...asStudioError(logServerError("removeStudioCover", error)) };
  }

  if (
    collection.cover_image_path &&
    isCollectionCoverPath(collection.cover_image_path, input.collectionId)
  ) {
    await getReferenceStorage()
      .from(IMAGE_BUCKET)
      .remove([collection.cover_image_path])
      .catch(() => undefined);
  }

  revalidateCatalogue();
  return { ok: true, kind: "saved", state: await loadStudioManagement(), data: {} };
}

