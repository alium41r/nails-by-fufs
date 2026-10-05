import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";

import { getPrisma } from "@/lib/prisma/db";
import { getSiteBasics } from "@/lib/site-content";
import {
  CATALOGUE_CACHE_SECONDS,
  CATALOGUE_CACHE_TAG,
} from "@/lib/catalogue-cache";
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
 * ## Caching (two layers, both doing different work)
 *
 * `unstable_cache` provides **cross-request** reuse: the result is persisted in
 * Next's data cache under the `storefront-catalogue` tag, so a navigation no
 * longer re-runs the queries. `invalidateCatalogue()` in `@/lib/catalogue-cache`
 * expires that entry from every catalogue write path.
 *
 * React's `cache` wraps it for **per-request** deduplication. This is not
 * redundant: a data-cache hit is cheap but not free (the stored payload is
 * deserialized), and one request legitimately reads the catalogue more than
 * once — the page body and `generateMetadata` both call this, and a page that
 * renders `<Shell>` reads it again for the header. Without the request-level
 * wrapper each of those would deserialize its own copy.
 *
 * Before this change the read was request-scoped only, so every navigation
 * repeated the full query cost. The audit measured exactly one catalogue read
 * (three SQL statements) per navigation, accounting for ~385 ms of the route's
 * time-to-first-byte.
 *
 * ## Freshness
 *
 * `CATALOGUE_CACHE_SECONDS` is a short backstop, not the primary mechanism;
 * invalidation is event-driven. It bounds staleness if a future write path
 * forgets to invalidate, and bounds cross-instance convergence on serverless
 * platforms, where `updateTag` can only expire the instance that took the write.
 */
const readCatalogue = unstable_cache(
  async (): Promise<StorefrontCatalogue> => {
    const prisma = getPrisma();

    // Read first: the product view model needs the store's configured currency to
    // label an unpriced product's placeholder. It is a cached read of one row,
    // and `getSiteBasics` is request-deduped, so this does not add a second
    // content query when the page renders content as well.
    const { defaultCurrency } = await getSiteBasics();

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
          // `collection_id` is nullable, so this relation can be null and the
          // selected shape has to say so.
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
      products: productRows.map((row) =>
        toProductView(row, imagesByProduct.get(row.id) ?? [], defaultCurrency),
      ),
    };
  },
  [CATALOGUE_CACHE_TAG],
  { tags: [CATALOGUE_CACHE_TAG], revalidate: CATALOGUE_CACHE_SECONDS },
);

export const getStorefrontCatalogue = cache(readCatalogue);
