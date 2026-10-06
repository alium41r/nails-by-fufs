import "server-only";

import { getPrisma } from "@/lib/prisma/db";
import { publicImageUrl, type PlaceholderRatio } from "@/lib/catalogue";
import type { ProductLength } from "@/lib/admin/catalogue-validation";
import { versionTokenExpression } from "@/lib/admin/version-token";
import { getSiteContent } from "@/lib/site-content";
import type { SiteContent } from "@/lib/site-content-schema";

/**
 * Management view models for Studio Mode.
 *
 * ## Why this is separate from the public catalogue
 *
 * `CatalogueProduct` / `CatalogueCollection` in `src/lib/catalogue.ts` describe
 * what a *customer* may see, which is why they carry no `is_active`, no
 * `featured` for products, no display order, no price in minor units and no
 * timestamps. Studio Mode edits exactly those fields, so it needs a different
 * projection — the management one below.
 *
 * This module is the only place that projection is built, and every caller is
 * an admin-authorised server path. Public reads continue to go through
 * `catalogue-server.ts`, so management-only metadata never reaches a visitor.
 *
 * ## `updatedAt` is the concurrency token
 *
 * Both tables carry `updated_at`, maintained by the `set_*_updated_at` triggers
 * that the migrations install. It is passed to the editor as an opaque string and
 * echoed back on save, where it becomes part of the UPDATE predicate. See
 * `catalogue-actions.ts` for how a mismatch is handled.
 *
 * The token is read with microsecond precision (see `version-token.ts`); it is
 * NOT the `Date` Prisma would return for the column, which is truncated to
 * milliseconds and therefore would never match the stored value.
 */

export interface StudioImageManagement {
  id: string;
  url: string | null;
  alt: string;
  isPrimary: boolean;
  sortOrder: number;
  ratio: PlaceholderRatio;
}

export interface StudioCollectionManagement {
  /** The primary key, which the public view model deliberately omits. */
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  tag: string | null;
  isActive: boolean;
  featured: boolean;
  displayOrder: number | null;
  coverImageUrl: string | null;
  /** True when a cover object exists in Storage (as opposed to none at all). */
  hasCover: boolean;
  updatedAt: string;
}

export interface StudioProductManagement {
  id: string;
  slug: string;
  /** Null when the product is not assigned to a collection. */
  collectionId: string | null;
  /** Empty string when there is no collection, matching `CatalogueProduct`. */
  collectionSlug: string;
  name: string;
  descriptor: string;
  description: string;
  shape: string;
  defaultLength: ProductLength;
  finish: string;
  tag: string | null;
  included: string[];
  /**
   * Minor units (paisa), or null for "unpriced". There is no currency field:
   * every price in this store is PKR, which `@/lib/currency` owns.
   */
  priceMinor: number | null;
  isActive: boolean;
  featured: boolean;
  displayOrder: number | null;
  images: StudioImageManagement[];
  updatedAt: string;
}

export interface StudioManagement {
  products: StudioProductManagement[];
  collections: StudioCollectionManagement[];
  /**
   * The owner-managed content documents, so Studio Mode can edit storefront copy
   * in place.
   *
   * Part of the admin-only projection for the same reason as everything else
   * here: the public storefront gets the *rendered result* of these documents,
   * and a visitor's response should not carry the editing surface's raw state.
   */
  content: SiteContent;
}

/**
 * Builds the whole management projection.
 *
 * The catalogue is small by design (an independent studio's catalogue), so this
 * returns every row rather than a paginated slice: Studio Mode needs the full
 * set to resolve a panel target and to reconcile drafts after a save.
 *
 * Note the deliberate absence of `PUBLIC_PRODUCT_FILTER` here. Studio Mode must
 * be able to edit an *inactive* product — that is how it is made active again —
 * so the visibility rule does not apply. It applies to every public read.
 */
export async function loadStudioManagement(): Promise<StudioManagement> {
  const prisma = getPrisma();

  const [collectionRows, productRows, imageRows] = await Promise.all([
    prisma.collections.findMany({
      orderBy: [{ display_order: { sort: "asc", nulls: "last" } }, { slug: "asc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        subtitle: true,
        description: true,
        tag: true,
        featured: true,
        is_active: true,
        display_order: true,
        cover_image_path: true,
      },
    }),
    prisma.products.findMany({
      orderBy: [{ display_order: { sort: "asc", nulls: "last" } }, { slug: "asc" }],
      select: {
        id: true,
        slug: true,
        collection_id: true,
        name: true,
        descriptor: true,
        description: true,
        shape: true,
        default_length: true,
        finish: true,
        tag: true,
        included: true,
        price_minor: true,
        is_active: true,
        featured: true,
        display_order: true,
        // Nullable: a product may exist without a collection.
        collections: { select: { slug: true } },
      },
    }),
    prisma.product_images.findMany({
      orderBy: [{ sort_order: "asc" }, { id: "asc" }],
      select: {
        id: true,
        product_id: true,
        storage_path: true,
        alt_text: true,
        sort_order: true,
        is_primary: true,
      },
    }),
  ]);

  // Content comes from the same read the storefront uses, so Studio Mode edits
  // exactly what a customer's page was built from.
  const content = await getSiteContent();

  // Version tokens for both tables, at full timestamp precision.
  const [collectionVersions, productVersions] = await Promise.all([
    prisma.$queryRawUnsafe<{ id: string; version: string }[]>(
      `select id, ${versionTokenExpression()} as version from collections`,
    ),
    prisma.$queryRawUnsafe<{ id: string; version: string }[]>(
      `select id, ${versionTokenExpression()} as version from products`,
    ),
  ]);
  const collectionVersionById = new Map(collectionVersions.map((row) => [row.id, row.version]));
  const productVersionById = new Map(productVersions.map((row) => [row.id, row.version]));

  const imagesByProduct = new Map<string, StudioImageManagement[]>();
  for (const row of imageRows) {
    const list = imagesByProduct.get(row.product_id) ?? [];
    list.push({
      id: row.id,
      url: publicImageUrl(row.storage_path),
      alt: row.alt_text,
      isPrimary: row.is_primary,
      sortOrder: row.sort_order,
      ratio: row.is_primary ? "portrait" : "square",
    });
    imagesByProduct.set(row.product_id, list);
  }

  return {
    content,
    collections: collectionRows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      subtitle: row.subtitle,
      description: row.description,
      tag: row.tag,
      isActive: row.is_active,
      featured: row.featured,
      displayOrder: row.display_order,
      coverImageUrl: publicImageUrl(row.cover_image_path),
      hasCover: Boolean(row.cover_image_path),
      updatedAt: collectionVersionById.get(row.id) ?? "",
    })),
    products: productRows.map((row) => ({
      id: row.id,
      slug: row.slug,
      collectionId: row.collection_id,
      collectionSlug: row.collections?.slug ?? "",
      name: row.name,
      descriptor: row.descriptor,
      description: row.description,
      shape: row.shape,
      defaultLength: row.default_length as ProductLength,
      finish: row.finish,
      tag: row.tag,
      included: row.included,
      priceMinor: row.price_minor,
      isActive: row.is_active,
      featured: row.featured,
      displayOrder: row.display_order,
      images: imagesByProduct.get(row.id) ?? [],
      updatedAt: productVersionById.get(row.id) ?? "",
    })),
  };
}
