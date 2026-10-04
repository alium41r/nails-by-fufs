import "server-only";

import { cache } from "react";

import { getPrisma } from "@/lib/prisma/db";
import {
  PUBLIC_COLLECTION_FILTER,
  PUBLIC_PRODUCT_FILTER,
  toCollectionView,
  toProductView,
  type CatalogueCollection,
  type CatalogueProduct,
  type ProductImageRow,
} from "@/lib/catalogue";

export interface StorefrontCatalogue {
  collections: CatalogueCollection[];
  products: CatalogueProduct[];
}

/**
 * The single read entry point for public catalogue data.
 *
 * Everything the storefront renders comes from here, so the public-visibility
 * rules live in one place (`PUBLIC_*_FILTER`) and cannot be forgotten by an
 * individual page. The connection is privileged and bypasses RLS, which is why
 * those filters are mandatory rather than optional.
 *
 * Ordering is `display_order` then `slug`, matching the order the catalogue was
 * published in and staying deterministic when `display_order` is NULL.
 *
 * Images are queried separately rather than through the relation: the partial
 * unique index on `product_images (product_id) WHERE is_primary` makes Prisma
 * model `products -> product_images` as one-to-one, which would hide every
 * non-primary image of a product.
 *
 * Rendering: every route that calls this declares
 * `export const dynamic = "force-dynamic"`, so the storefront reflects the live
 * catalogue rather than a snapshot taken during `next build` (Next would
 * otherwise prerender a page that performs only I/O). Moving to ISR
 * (`export const revalidate = ...`) is the natural next step once there is
 * traffic data to justify trading freshness for cached rendering.
 */
/**
 * Wrapped in React's `cache`, so the shell and the page share a single read per
 * request instead of querying twice.
 */
export const getStorefrontCatalogue = cache(async (): Promise<StorefrontCatalogue> => {
  const prisma = getPrisma();

  const [collectionRows, productRows] = await Promise.all([
    prisma.collections.findMany({
      where: PUBLIC_COLLECTION_FILTER,
      orderBy: [{ display_order: { sort: "asc", nulls: "last" } }, { slug: "asc" }],
      select: {
        cover_image_path: true,
        slug: true,
        title: true,
        subtitle: true,
        description: true,
        tag: true,
        featured: true,
      },
    }),
    prisma.products.findMany({
      where: PUBLIC_PRODUCT_FILTER,
      orderBy: [{ display_order: { sort: "asc", nulls: "last" } }, { slug: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        descriptor: true,
        description: true,
        shape: true,
        default_length: true,
        finish: true,
        tag: true,
        included: true,
        price_minor: true,
        currency: true,
        collections: { select: { slug: true, title: true } },
      },
    }),
  ]);

  const productIds = productRows.map((row) => row.id);

  const imageRows: ProductImageRow[] =
    productIds.length === 0
      ? []
      : await prisma.product_images.findMany({
          where: {
            product_id: { in: productIds },
            products: { is_active: true, collections: { is_active: true } },
          },
          orderBy: [{ sort_order: "asc" }, { id: "asc" }],
          select: {
            id: true,
            product_id: true,
            storage_path: true,
            alt_text: true,
            sort_order: true,
            is_primary: true,
          },
        });

  const imagesByProduct = new Map<string, ProductImageRow[]>();
  for (const image of imageRows) {
    const bucket = imagesByProduct.get(image.product_id);
    if (bucket) bucket.push(image);
    else imagesByProduct.set(image.product_id, [image]);
  }

  return {
    collections: collectionRows.map(toCollectionView),
    products: productRows.map((row) => toProductView(row, imagesByProduct.get(row.id) ?? [])),
  };
});
