"use server";

import { invalidateCatalogue } from "@/lib/catalogue-cache";
import { getAdminUser } from "@/lib/admin/auth";
import {
  MAX_NAME_LENGTH,
  SLUG_PATTERN,
  describeCollectionWriteError,
  describeProductWriteError,
  errorMessage,
  normalizeOptionalText,
  slugify,
} from "@/lib/admin/catalogue-validation";
import {
  IMAGE_BUCKET,
  isCollectionCoverPath,
  isProductImagePath,
  isUuid,
} from "@/lib/admin/paths";
import { getPrisma } from "@/lib/prisma/db";
import { getReferenceStorage } from "@/lib/supabase/admin";
import type {
  BulkCollectionAction,
  BulkProductAction,
  CatalogueResult,
  CreateProductInput,
} from "@/lib/admin/catalogue-lifecycle-types";

/**
 * Catalogue lifecycle: creating, duplicating, archiving, restoring, deleting and
 * reordering products and collections.
 *
 * ## Why this is a separate module from `catalogue-actions.ts`
 *
 * `catalogue-actions.ts` is the Studio Mode write surface and returns result
 * objects designed for a visual editor. This module backs the Control Center's
 * forms, which are ordinary `<form>` submissions that redirect with a query
 * parameter. Both call the *same* validators in `@/lib/admin/catalogue-validation`
 * and, where a rule is shared, the same guards — only the delivery of the outcome
 * differs. Keeping them apart stops either surface's result contract leaking into
 * the other.
 *
 * ## Authorisation
 *
 * Every export calls `assertAdmin()` first. A `"use server"` module export is a
 * public HTTP endpoint, so no action may rely on the UI having hidden a button.
 *
 * ## Archive versus delete
 *
 * Archiving is the default and is fully reversible: it sets `archived_at`, which
 * every public read filters on, and leaves the row, its images and its slug
 * intact. Permanent deletion is the exception and each entry point requires the
 * caller to have typed the row's own name as confirmation — the actions re-check
 * that server-side rather than trusting a disabled button.
 */

const UNAUTHORIZED = { ok: false as const, error: "Not authorised." };

async function assertAdmin(): Promise<boolean> {
  return (await getAdminUser()) !== null;
}

/**
 * Finds a free slug by appending `-2`, `-3`, … .
 *
 * Archived rows keep their slug deliberately (they are still reachable by link
 * from the archive list and may be restored), so a new row that wants a taken
 * slug gets a suffix rather than stealing it. Capped so a pathological table
 * cannot spin here.
 */
async function uniqueProductSlug(base: string): Promise<string> {
  const prisma = getPrisma();
  const root = SLUG_PATTERN.test(base) ? base : "product";
  for (let suffix = 1; suffix <= 200; suffix += 1) {
    const candidate = suffix === 1 ? root : `${root}-${suffix}`;
    const taken = await prisma.products.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  return `${root}-${Date.now()}`;
}

async function uniqueCollectionSlug(base: string): Promise<string> {
  const prisma = getPrisma();
  const root = SLUG_PATTERN.test(base) ? base : "collection";
  for (let suffix = 1; suffix <= 200; suffix += 1) {
    const candidate = suffix === 1 ? root : `${root}-${suffix}`;
    const taken = await prisma.collections.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  return `${root}-${Date.now()}`;
}

/** Next display order after the current maximum, so a new row lands last. */
async function nextProductOrder(): Promise<number> {
  const max = await getPrisma().products.aggregate({ _max: { display_order: true } });
  return (max._max.display_order ?? 0) + 1;
}

async function nextCollectionOrder(): Promise<number> {
  const max = await getPrisma().collections.aggregate({ _max: { display_order: true } });
  return (max._max.display_order ?? 0) + 1;
}

/* -------------------------------------------------------------------------- */
/* Products — create                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Creates a product.
 *
 * Only `name` is genuinely required by the owner, so the rest is defaulted to an
 * empty-but-valid row: `shape` and `default_length` are NOT NULL with a CHECK on
 * the length, so they get placeholder values the owner is expected to replace
 * rather than values invented as business facts. The product is created
 * **inactive**, so a half-filled new row can never appear on the storefront by
 * accident — publishing is an explicit second step.
 *
 * `collection_id` is optional because it became nullable; a product with no
 * collection is a valid row the storefront renders without a collection name.
 */
export async function createProduct(input: CreateProductInput): Promise<CatalogueResult> {
  if (!(await assertAdmin())) return UNAUTHORIZED;

  const name = input.name.trim();
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Name is required (max ${MAX_NAME_LENGTH} characters).` };
  }

  const collectionId = input.collectionId && isUuid(input.collectionId) ? input.collectionId : null;
  if (collectionId) {
    const collection = await getPrisma().collections.findUnique({
      where: { id: collectionId },
      select: { id: true, archived_at: true },
    });
    if (!collection) return { ok: false, error: "That collection no longer exists." };
    if (collection.archived_at) {
      return { ok: false, error: "That collection is archived. Restore it first, or pick another." };
    }
  }

  const slug = await uniqueProductSlug(slugify(input.slug?.trim() || name));

  try {
    const created = await getPrisma().products.create({
      data: {
        name,
        slug,
        collection_id: collectionId,
        descriptor: (input.descriptor ?? "").trim(),
        description: (input.description ?? "").trim(),
        // Required by the schema, not business claims: the owner fills these in.
        shape: (input.shape ?? "").trim() || "Almond",
        default_length: input.defaultLength === "Short" || input.defaultLength === "Long" ? input.defaultLength : "Medium",
        finish: (input.finish ?? "").trim(),
        display_order: await nextProductOrder(),
        // Never published on creation: a draft must not reach the storefront.
        is_active: false,
      },
      select: { id: true, slug: true },
    });

    invalidateCatalogue();
    return { ok: true, id: created.id, slug: created.slug, message: `Created “${name}” as a draft.` };
  } catch (error) {
    return { ok: false, error: describeProductWriteError(errorMessage(error)) };
  }
}

/**
 * Duplicates a product as a starting point for a new one.
 *
 * The copy carries the source's text, imagery metadata, "included" list and
 * price — a price is copied *as the same pair of values*, never converted or
 * adjusted, because the owner is duplicating a set that is presumably sold at a
 * similar price and will edit it either way.
 *
 * Deliberately not copied: `is_active` (a duplicate is always an unpublished
 * draft), `featured` and `display_order` (a copy should not silently take the
 * original's position in the catalogue).
 */
export async function duplicateProduct(input: { productId: string }): Promise<CatalogueResult> {
  if (!(await assertAdmin())) return UNAUTHORIZED;
  if (!isUuid(input.productId)) return { ok: false, error: "Unknown product." };

  const prisma = getPrisma();
  const source = await prisma.products.findUnique({
    where: { id: input.productId },
    select: {
      name: true,
      collection_id: true,
      descriptor: true,
      description: true,
      shape: true,
      default_length: true,
      finish: true,
      tag: true,
      included: true,
      price_minor: true,
      currency: true,
    },
  });
  if (!source) return { ok: false, error: "That product no longer exists." };

  const name = `${source.name} (copy)`.slice(0, MAX_NAME_LENGTH);
  const slug = await uniqueProductSlug(slugify(`${source.name}-copy`));

  try {
    const created = await prisma.products.create({
      data: {
        name,
        slug,
        // Kept in the same collection when it is still assignable.
        collection_id: source.collection_id,
        descriptor: source.descriptor,
        description: source.description,
        shape: source.shape,
        default_length: source.default_length,
        finish: source.finish,
        tag: source.tag,
        included: source.included,
        price_minor: source.price_minor,
        currency: source.currency,
        display_order: await nextProductOrder(),
        is_active: false,
        featured: false,
      },
      select: { id: true, slug: true },
    });

    invalidateCatalogue();
    return { ok: true, id: created.id, slug: created.slug, message: `Duplicated as “${name}” (draft).` };
  } catch (error) {
    return { ok: false, error: describeProductWriteError(errorMessage(error)) };
  }
}

/* -------------------------------------------------------------------------- */
/* Products — archive, restore, delete                                         */
/* -------------------------------------------------------------------------- */

/**
 * Archives a product: retired, hidden from the storefront, kept in the database.
 *
 * Also clears `is_active`, so restoring later does not silently republish a set
 * the owner had retired — restoring returns it to the catalogue as an unpublished
 * draft, and publishing remains a separate, deliberate action.
 */
export async function archiveProduct(input: {
  productId: string;
  note?: string;
}): Promise<CatalogueResult> {
  if (!(await assertAdmin())) return UNAUTHORIZED;
  if (!isUuid(input.productId)) return { ok: false, error: "Unknown product." };

  const note = await normalizeOptionalText(input.note, 300);
  if (!note.ok) return { ok: false, error: note.error };

  try {
    await getPrisma().products.update({
      where: { id: input.productId },
      data: { archived_at: new Date(), archive_note: note.value, is_active: false, featured: false },
    });
  } catch (error) {
    return { ok: false, error: describeProductWriteError(errorMessage(error)) };
  }

  invalidateCatalogue();
  return { ok: true, message: "Archived. It is hidden from the storefront and can be restored." };
}

/** Restores an archived product as an unpublished draft. */
export async function restoreProduct(input: { productId: string }): Promise<CatalogueResult> {
  if (!(await assertAdmin())) return UNAUTHORIZED;
  if (!isUuid(input.productId)) return { ok: false, error: "Unknown product." };

  // A product cannot be published while its collection is archived, because the
  // public filter would still hide it — that would look like a broken publish.
  const product = await getPrisma().products.findUnique({
    where: { id: input.productId },
    select: { collections: { select: { title: true, archived_at: true } } },
  });

  try {
    await getPrisma().products.update({
      where: { id: input.productId },
      data: { archived_at: null, archive_note: null, is_active: false },
    });
  } catch (error) {
    return { ok: false, error: describeProductWriteError(errorMessage(error)) };
  }

  invalidateCatalogue();

  if (product?.collections?.archived_at) {
    return {
      ok: true,
      message: `Restored as a draft. Its collection “${product.collections.title}” is archived, so it stays hidden until that is restored too.`,
    };
  }
  return { ok: true, message: "Restored as a draft. Publish it when it is ready." };
}

/**
 * Permanently deletes a product.
 *
 * Three things have to be handled for this to be safe, and all three are:
 *
 *  1. **Images.** The Storage objects are removed *before* the row, so a failure
 *     leaves a product whose files are still referenced rather than orphaned
 *     objects nobody can reach. `product_images` then cascades with the row.
 *  2. **Order history.** `order_items.product_id` is `ON DELETE SET NULL`, and
 *     every line already stores a full snapshot (name, descriptor, shape,
 *     finish, collection slug, price), so past orders keep rendering exactly as
 *     they did. Deleting a product cannot rewrite an invoice.
 *  3. **Confirmation.** `confirmName` must equal the product's current name. The
 *     caller asks the owner to type it; this re-checks server-side, so a forged
 *     request with a guessed id cannot delete anything.
 *
 * The slug is released by the delete, so a subsequent product may reuse it.
 */
export async function deleteProduct(input: {
  productId: string;
  confirmName: string;
}): Promise<CatalogueResult> {
  if (!(await assertAdmin())) return UNAUTHORIZED;
  if (!isUuid(input.productId)) return { ok: false, error: "Unknown product." };

  const prisma = getPrisma();
  const product = await prisma.products.findUnique({
    where: { id: input.productId },
    select: { name: true, slug: true },
  });
  if (!product) return { ok: false, error: "That product no longer exists." };

  if (input.confirmName.trim() !== product.name) {
    return {
      ok: false,
      error: `To delete permanently, type the product's exact name (“${product.name}”).`,
    };
  }

  // Storage first: if this fails, nothing in the database has changed yet.
  const images = await prisma.product_images.findMany({
    where: { product_id: input.productId },
    select: { storage_path: true },
  });
  const paths = images
    .map((image) => image.storage_path)
    .filter((path) => isProductImagePath(path, input.productId));

  if (paths.length > 0) {
    const { error } = await getReferenceStorage().from(IMAGE_BUCKET).remove(paths);
    if (error) {
      return {
        ok: false,
        error: "Its images could not be removed from storage, so nothing was deleted. Please try again.",
      };
    }
  }

  try {
    await prisma.products.delete({ where: { id: input.productId } });
  } catch (error) {
    return { ok: false, error: describeProductWriteError(errorMessage(error)) };
  }

  invalidateCatalogue();
  return { ok: true, message: `Deleted “${product.name}” permanently.` };
}

/* -------------------------------------------------------------------------- */
/* Collections — create                                                        */
/* -------------------------------------------------------------------------- */

export async function createCollection(input: {
  title: string;
  subtitle?: string;
  description?: string;
  slug?: string;
}): Promise<CatalogueResult> {
  if (!(await assertAdmin())) return UNAUTHORIZED;

  const title = input.title.trim();
  if (title.length === 0 || title.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Title is required (max ${MAX_NAME_LENGTH} characters).` };
  }

  const slug = await uniqueCollectionSlug(slugify(input.slug?.trim() || title));

  try {
    const created = await getPrisma().collections.create({
      data: {
        title,
        slug,
        subtitle: (input.subtitle ?? "").trim(),
        description: (input.description ?? "").trim(),
        display_order: await nextCollectionOrder(),
        // Unpublished on creation: see createProduct.
        is_active: false,
      },
      select: { id: true, slug: true },
    });

    invalidateCatalogue();
    return { ok: true, id: created.id, slug: created.slug, message: `Created “${title}” as a draft.` };
  } catch (error) {
    return { ok: false, error: describeCollectionWriteError(errorMessage(error)) };
  }
}

/* -------------------------------------------------------------------------- */
/* Collections — archive, restore, delete                                      */
/* -------------------------------------------------------------------------- */

/**
 * Archives a collection.
 *
 * Archiving hides the collection *and every product inside it*, which is the
 * existing catalogue rule for an inactive collection. That is a bigger blast
 * radius than archiving one product, so the result message says how many
 * products went with it rather than leaving the owner to discover it.
 */
export async function archiveCollection(input: {
  collectionId: string;
  note?: string;
}): Promise<CatalogueResult> {
  if (!(await assertAdmin())) return UNAUTHORIZED;
  if (!isUuid(input.collectionId)) return { ok: false, error: "Unknown collection." };

  const note = await normalizeOptionalText(input.note, 300);
  if (!note.ok) return { ok: false, error: note.error };

  const prisma = getPrisma();
  const affected = await prisma.products.count({ where: { collection_id: input.collectionId } });

  try {
    await prisma.collections.update({
      where: { id: input.collectionId },
      data: { archived_at: new Date(), archive_note: note.value, is_active: false, featured: false },
    });
  } catch (error) {
    return { ok: false, error: describeCollectionWriteError(errorMessage(error)) };
  }

  invalidateCatalogue();
  return {
    ok: true,
    message:
      affected === 0
        ? "Archived and hidden from the storefront."
        : `Archived. Its ${affected} product${affected === 1 ? "" : "s"} are hidden from the storefront too, until it is restored.`,
  };
}

export async function restoreCollection(input: { collectionId: string }): Promise<CatalogueResult> {
  if (!(await assertAdmin())) return UNAUTHORIZED;
  if (!isUuid(input.collectionId)) return { ok: false, error: "Unknown collection." };

  try {
    await getPrisma().collections.update({
      where: { id: input.collectionId },
      data: { archived_at: null, archive_note: null, is_active: false },
    });
  } catch (error) {
    return { ok: false, error: describeCollectionWriteError(errorMessage(error)) };
  }

  invalidateCatalogue();
  return { ok: true, message: "Restored as a draft. Publish it when it is ready." };
}

/**
 * Reports what depends on a collection, so the UI can offer the right choices.
 *
 * Exists so blocking a deletion is informative rather than mysterious: the owner
 * is told exactly how many products stand in the way and can then move them.
 */
export async function collectionDependencies(input: {
  collectionId: string;
}): Promise<
  | { ok: true; productCount: number; otherCollectionCount: number }
  | { ok: false; error: string }
> {
  if (!(await assertAdmin())) return { ok: false, error: "Not authorised." };
  if (!isUuid(input.collectionId)) return { ok: false, error: "Unknown collection." };

  const prisma = getPrisma();
  const [productCount, otherCollectionCount] = await Promise.all([
    prisma.products.count({ where: { collection_id: input.collectionId } }),
    prisma.collections.count({
      where: { id: { not: input.collectionId }, archived_at: null },
    }),
  ]);

  return { ok: true, productCount, otherCollectionCount };
}

/**
 * Reassigns every product in one collection.
 *
 * Part of the safe-deletion workflow: a collection with products cannot be
 * deleted (the FK is ON DELETE RESTRICT and the action refuses first), so the
 * owner either moves the products to another collection — or to no collection at
 * all — and then deletes the empty collection.
 *
 * Refuses to move products into an archived collection, because that would hide
 * them without the owner intending it.
 */
export async function reassignCollectionProducts(input: {
  fromCollectionId: string;
  toCollectionId: string | null;
}): Promise<CatalogueResult> {
  if (!(await assertAdmin())) return UNAUTHORIZED;
  if (!isUuid(input.fromCollectionId)) return { ok: false, error: "Unknown collection." };

  let targetId: string | null = null;
  if (input.toCollectionId !== null) {
    if (!isUuid(input.toCollectionId)) return { ok: false, error: "Unknown destination collection." };
    if (input.toCollectionId === input.fromCollectionId) {
      return { ok: false, error: "Choose a different collection to move them into." };
    }
    const target = await getPrisma().collections.findUnique({
      where: { id: input.toCollectionId },
      select: { title: true, archived_at: true },
    });
    if (!target) return { ok: false, error: "That destination no longer exists." };
    if (target.archived_at) {
      return { ok: false, error: `“${target.title}” is archived, so its products stay hidden. Restore it first.` };
    }
    targetId = input.toCollectionId;
  }

  try {
    const moved = await getPrisma().products.updateMany({
      where: { collection_id: input.fromCollectionId },
      data: { collection_id: targetId },
    });
    invalidateCatalogue();
    return {
      ok: true,
      message:
        moved.count === 0
          ? "There were no products to move."
          : `Moved ${moved.count} product${moved.count === 1 ? "" : "s"}.`,
    };
  } catch (error) {
    return { ok: false, error: describeCollectionWriteError(errorMessage(error)) };
  }
}

/**
 * Permanently deletes a collection.
 *
 * Refused while any product still references it. That is deliberate rather than
 * a cascade: `products.collection_id` is ON DELETE RESTRICT, and a cascade here
 * would destroy catalogue rows and their images from one click. The owner is
 * directed to the reassignment workflow instead, and the count is re-read here so
 * a stale page cannot get past it.
 */
export async function deleteCollection(input: {
  collectionId: string;
  confirmName: string;
}): Promise<CatalogueResult> {
  if (!(await assertAdmin())) return UNAUTHORIZED;
  if (!isUuid(input.collectionId)) return { ok: false, error: "Unknown collection." };

  const prisma = getPrisma();
  const collection = await prisma.collections.findUnique({
    where: { id: input.collectionId },
    select: { title: true, cover_image_path: true },
  });
  if (!collection) return { ok: false, error: "That collection no longer exists." };

  const productCount = await prisma.products.count({ where: { collection_id: input.collectionId } });
  if (productCount > 0) {
    return {
      ok: false,
      error: `“${collection.title}” still holds ${productCount} product${productCount === 1 ? "" : "s"}. Move them to another collection (or to none) first — deleting a collection never deletes products.`,
    };
  }

  if (input.confirmName.trim() !== collection.title) {
    return {
      ok: false,
      error: `To delete permanently, type the collection's exact title (“${collection.title}”).`,
    };
  }

  // Cover object first, so a failure leaves the row pointing at a real file.
  if (collection.cover_image_path && isCollectionCoverPath(collection.cover_image_path, input.collectionId)) {
    const { error } = await getReferenceStorage()
      .from(IMAGE_BUCKET)
      .remove([collection.cover_image_path]);
    if (error) {
      return {
        ok: false,
        error: "Its cover image could not be removed from storage, so nothing was deleted. Please try again.",
      };
    }
  }

  try {
    await prisma.collections.delete({ where: { id: input.collectionId } });
  } catch (error) {
    return { ok: false, error: describeCollectionWriteError(errorMessage(error)) };
  }

  invalidateCatalogue();
  return { ok: true, message: `Deleted “${collection.title}” permanently.` };
}

/* -------------------------------------------------------------------------- */
/* Reordering                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Applies an explicit product order.
 *
 * Takes the *whole* ordered id list rather than a pairwise swap, because that is
 * what a drag-and-drop interaction actually produces and it makes the operation
 * idempotent: sending the same list twice changes nothing, and a dropped frame
 * cannot leave two rows sharing an order. `display_order` is rewritten as
 * 1..n for exactly the ids supplied, so the catalogue's ordering becomes dense
 * and predictable instead of accumulating gaps.
 */
export async function reorderProducts(input: { productIds: string[] }): Promise<CatalogueResult> {
  if (!(await assertAdmin())) return UNAUTHORIZED;

  const ids = input.productIds.filter(isUuid);
  if (ids.length === 0) return { ok: false, error: "Nothing to reorder." };
  if (ids.length !== new Set(ids).size) return { ok: false, error: "That order list contains duplicates." };

  const prisma = getPrisma();
  const existing = await prisma.products.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
  // Refuse a partial apply: an id that no longer exists means the page is stale,
  // and writing the rest would silently renumber a list the owner did not see.
  if (existing.length !== ids.length) {
    return { ok: false, error: "The catalogue changed while you were reordering. Reload and try again." };
  }

  try {
    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.products.update({ where: { id }, data: { display_order: index + 1 } }),
      ),
    );
  } catch (error) {
    return { ok: false, error: describeProductWriteError(errorMessage(error)) };
  }

  invalidateCatalogue();
  return { ok: true, message: "Order saved." };
}

export async function reorderCollections(input: { collectionIds: string[] }): Promise<CatalogueResult> {
  if (!(await assertAdmin())) return UNAUTHORIZED;

  const ids = input.collectionIds.filter(isUuid);
  if (ids.length === 0) return { ok: false, error: "Nothing to reorder." };
  if (ids.length !== new Set(ids).size) return { ok: false, error: "That order list contains duplicates." };

  const prisma = getPrisma();
  const existing = await prisma.collections.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
  if (existing.length !== ids.length) {
    return { ok: false, error: "The collections changed while you were reordering. Reload and try again." };
  }

  try {
    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.collections.update({ where: { id }, data: { display_order: index + 1 } }),
      ),
    );
  } catch (error) {
    return { ok: false, error: describeCollectionWriteError(errorMessage(error)) };
  }

  invalidateCatalogue();
  return { ok: true, message: "Order saved." };
}

/* -------------------------------------------------------------------------- */
/* Bulk actions                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Applies one change to many products at once.
 *
 * The whole selection is validated before anything is written: if any id no
 * longer exists the operation is refused rather than partially applied, so the
 * owner never has to work out which half of a bulk action landed.
 */
export async function bulkUpdateProducts(input: {
  productIds: string[];
  action: BulkProductAction;
  collectionId?: string | null;
}): Promise<CatalogueResult> {
  if (!(await assertAdmin())) return UNAUTHORIZED;

  const ids = input.productIds.filter(isUuid);
  if (ids.length === 0) return { ok: false, error: "Select at least one product." };
  if (ids.length !== new Set(ids).size) return { ok: false, error: "That selection contains duplicates." };
  if (ids.length > 500) return { ok: false, error: "Select 500 products or fewer at a time." };

  const prisma = getPrisma();
  const found = await prisma.products.count({ where: { id: { in: ids } } });
  if (found !== ids.length) {
    return { ok: false, error: "Some of those products no longer exist. Reload and try again." };
  }

  let data: Record<string, unknown>;
  let message: string;

  switch (input.action) {
    case "activate":
      data = { is_active: true };
      message = `Published ${ids.length} product${ids.length === 1 ? "" : "s"}.`;
      break;
    case "deactivate":
      data = { is_active: false };
      message = `Unpublished ${ids.length} product${ids.length === 1 ? "" : "s"}.`;
      break;
    case "feature":
      data = { featured: true };
      message = `Featured ${ids.length} product${ids.length === 1 ? "" : "s"}.`;
      break;
    case "unfeature":
      data = { featured: false };
      message = `Removed the featured flag from ${ids.length} product${ids.length === 1 ? "" : "s"}.`;
      break;
    case "archive":
      data = { archived_at: new Date(), is_active: false, featured: false };
      message = `Archived ${ids.length} product${ids.length === 1 ? "" : "s"}.`;
      break;
    case "restore":
      data = { archived_at: null, archive_note: null, is_active: false };
      message = `Restored ${ids.length} product${ids.length === 1 ? "" : "s"} as drafts.`;
      break;
    case "assign-collection": {
      const target = input.collectionId ?? null;
      if (target !== null) {
        if (!isUuid(target)) return { ok: false, error: "Unknown destination collection." };
        const collection = await prisma.collections.findUnique({
          where: { id: target },
          select: { title: true, archived_at: true },
        });
        if (!collection) return { ok: false, error: "That destination no longer exists." };
        if (collection.archived_at) {
          return {
            ok: false,
            error: `“${collection.title}” is archived, so its products stay hidden. Restore it first.`,
          };
        }
      }
      data = { collection_id: target };
      message =
        target === null
          ? `Removed ${ids.length} product${ids.length === 1 ? "" : "s"} from their collection.`
          : `Moved ${ids.length} product${ids.length === 1 ? "" : "s"}.`;
      break;
    }
    default:
      return { ok: false, error: "Unknown bulk action." };
  }

  try {
    await prisma.products.updateMany({ where: { id: { in: ids } }, data });
  } catch (error) {
    return { ok: false, error: describeProductWriteError(errorMessage(error)) };
  }

  invalidateCatalogue();
  return { ok: true, message };
}

export async function bulkUpdateCollections(input: {
  collectionIds: string[];
  action: BulkCollectionAction;
}): Promise<CatalogueResult> {
  if (!(await assertAdmin())) return UNAUTHORIZED;

  const ids = input.collectionIds.filter(isUuid);
  if (ids.length === 0) return { ok: false, error: "Select at least one collection." };
  if (ids.length !== new Set(ids).size) return { ok: false, error: "That selection contains duplicates." };

  const prisma = getPrisma();
  const found = await prisma.collections.count({ where: { id: { in: ids } } });
  if (found !== ids.length) {
    return { ok: false, error: "Some of those collections no longer exist. Reload and try again." };
  }

  const map: Record<BulkCollectionAction, { data: Record<string, unknown>; message: string }> = {
    activate: { data: { is_active: true }, message: `Published ${ids.length} collection(s).` },
    deactivate: { data: { is_active: false }, message: `Unpublished ${ids.length} collection(s) — their products are hidden too.` },
    feature: { data: { featured: true }, message: `Featured ${ids.length} collection(s).` },
    unfeature: { data: { featured: false }, message: `Removed the featured flag from ${ids.length} collection(s).` },
    archive: {
      data: { archived_at: new Date(), is_active: false, featured: false },
      message: `Archived ${ids.length} collection(s). Their products are hidden from the storefront too.`,
    },
    restore: { data: { archived_at: null, archive_note: null, is_active: false }, message: `Restored ${ids.length} collection(s) as drafts.` },
  };

  const entry = map[input.action];
  if (!entry) return { ok: false, error: "Unknown bulk action." };

  try {
    await prisma.collections.updateMany({ where: { id: { in: ids } }, data: entry.data });
  } catch (error) {
    return { ok: false, error: describeCollectionWriteError(errorMessage(error)) };
  }

  invalidateCatalogue();
  return { ok: true, message: entry.message };
}
