import type { Prisma } from "@/generated/prisma/client";

import { formatPrice as formatMoney, pricePlaceholder } from "@/lib/currency";

/**
 * Catalogue view model + mapping rules.
 *
 * This module is deliberately free of `server-only` and of any Prisma *runtime*
 * import (`import type` is erased) so client components can share these types
 * and so the mapping/visibility rules can be unit-tested without a database.
 * The actual queries live in `catalogue-server.ts`.
 *
 * ## Visibility is enforced by the query, mirrored here for tests
 *
 * `PUBLIC_PRODUCT_FILTER` / `PUBLIC_COLLECTION_FILTER` are the single source of
 * truth for what the public storefront may see. They exist because the Prisma
 * connection is privileged and bypasses the catalogue's row level security, so
 * the rules written in supabase/migrations/20261004114546_catalog_rls.sql have
 * to be restated here: a row is public only when it is active *and* its parent
 * collection is active.
 *
 * Archiving is the second visibility rule and it is *only* enforced here —
 * `archived_at` has no RLS policy, because RLS cannot express "archived rows are
 * invisible to clients but listable by the admin through the same privileged
 * connection". Every public read must therefore go through these filters.
 */

/* -------------------------------------------------------------------------- */
/* Visibility filters (the security contract)                                  */
/* -------------------------------------------------------------------------- */

export const PUBLIC_COLLECTION_FILTER = {
  is_active: true,
  archived_at: null,
} as const satisfies Prisma.collectionsWhereInput;

export const PUBLIC_PRODUCT_FILTER = {
  is_active: true,
  archived_at: null,
  // A product is public only when its collection is public. The `is` form (rather
  // than a nested `where`) is what makes this expressible now that
  // `collection_id` is nullable: a product with no collection is not in an
  // active collection, so it is correctly excluded rather than crashing the
  // relation filter.
  collections: { is: { is_active: true, archived_at: null } },
} as const satisfies Prisma.productsWhereInput;

/* -------------------------------------------------------------------------- */
/* Presentation constants                                                      */
/* -------------------------------------------------------------------------- */

const PRODUCT_PLACEHOLDER_SUBLABEL = "4:5 • PRODUCT SHOT";
const COLLECTION_PLACEHOLDER_SUBLABEL = "COLLECTION ARCHIVE";

/**
 * The aspect ratios a catalogue or content image slot can request.
 *
 * Structurally identical to `AspectRatio` in `@/components/media/ImagePlaceholder`
 * — that component is the only consumer and it already supported all five.
 * `wide` and `tall` were simply unreachable from catalogue data before, because
 * the storefront passed a literal ratio in JSX. Now that a content document can
 * choose the ratio for a slot, the type has to admit them, or the featured
 * collection's 16:9 lookbook (a `wide` slot since it was built) could not be
 * expressed.
 */
export type PlaceholderRatio = "portrait" | "square" | "classic" | "wide" | "tall";

export interface CataloguePlaceholder {
  label: string;
  sublabel: string;
  alt: string;
}

export interface CatalogueImage {
  id: string;
  label: string;
  sublabel: string;
  alt: string;
  ratio: PlaceholderRatio;
  /** Public Storage URL when real photography exists; null for placeholders. */
  url: string | null;
}

export interface CatalogueCollection {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  tag?: string;
  featured: boolean;
  imagePlaceholder: CataloguePlaceholder;
  /** Public cover URL, or null when the collection has no cover image yet. */
  coverImageUrl: string | null;
}

export interface CatalogueProduct {
  id: string;
  slug: string;
  name: string;
  descriptor: string;
  price: string;
  tag?: string;
  collectionSlug: string;
  collectionName: string;
  shape: string;
  length: "Short" | "Medium" | "Long";
  finish: string;
  description: string;
  included: string[];
  images: CatalogueImage[];
  imagePlaceholder: CataloguePlaceholder;
}

/* -------------------------------------------------------------------------- */
/* Row shapes (exactly what the queries select)                                */
/* -------------------------------------------------------------------------- */

export interface CollectionRow {
  cover_image_path: string | null;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  tag: string | null;
  featured: boolean;
}

export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  descriptor: string;
  description: string;
  shape: string;
  default_length: string;
  finish: string;
  tag: string | null;
  included: string[];
  price_minor: number | null;
  currency: string | null;
  /**
   * Null when the product is not assigned to a collection — a state the admin
   * can create now that `collection_id` is nullable, and one the storefront has
   * to render rather than assume away.
   */
  collections: { slug: string; title: string } | null;
}

export interface ProductImageRow {
  id: string;
  product_id: string;
  storage_path: string;
  alt_text: string;
  sort_order: number;
  is_primary: boolean;
}

/* -------------------------------------------------------------------------- */
/* Mapping                                                                     */
/* -------------------------------------------------------------------------- */

function asLength(value: string): CatalogueProduct["length"] {
  return value === "Short" || value === "Long" ? value : "Medium";
}

/**
 * The price a customer sees, or the placeholder when there is none.
 *
 * Delegates to `@/lib/currency`, which owns the one definition of how money is
 * formatted and what the placeholder looks like. The row's stored `currency` is
 * not consulted: the database guarantees it is PKR, and a display path that
 * accepted a code would be a second place to get the store's currency wrong.
 */
function formatPrice(priceMinor: number | null): string {
  if (priceMinor === null) return pricePlaceholder();
  return formatMoney(priceMinor);
}

/** Public URL for an object in the public catalogue images bucket. */
export function publicImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/product-images/${path}`;
}

export function toCollectionView(row: CollectionRow): CatalogueCollection {
  return {
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    ...(row.tag === null ? {} : { tag: row.tag }),
    featured: row.featured,
    coverImageUrl: publicImageUrl(row.cover_image_path),
    imagePlaceholder: {
      label: `${row.title} Lookbook`,
      sublabel: COLLECTION_PLACEHOLDER_SUBLABEL,
      alt: `${row.title} lookbook visual presentation`,
    },
  };
}

/**
 * Builds the gallery for a product.
 *
 * The storefront is still entirely placeholder-driven: there is no Storage
 * bucket and no image files in the project, so `product_images` is empty and a
 * single derived placeholder stands in for the missing photography. When real
 * rows exist they are used instead — ordered by `sort_order`, primary first —
 * and the placeholder copy is derived from the product, never invented as image
 * metadata.
 */
export function toImageViews(product: ProductRow, rows: ProductImageRow[]): CatalogueImage[] {
  if (rows.length === 0) return [primaryPlaceholderImage(product)];

  return [...rows]
    .sort((a, b) => {
      if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.id.localeCompare(b.id);
    })
    .map((row, index) => ({
      id: row.id,
      label: index === 0 ? `${product.name} Set` : `${product.name} Detail ${index + 1}`,
      sublabel: row.is_primary ? PRODUCT_PLACEHOLDER_SUBLABEL : `SHOT ${index + 1}`,
      alt: row.alt_text || `${product.name} press-on nail set`,
      ratio: index === 0 ? "portrait" : "square",
      url: publicImageUrl(row.storage_path),
    }));
}

function primaryPlaceholderImage(product: ProductRow): CatalogueImage {
  return {
    id: `placeholder-${product.id}`,
    label: `${product.name} Set`,
    sublabel: PRODUCT_PLACEHOLDER_SUBLABEL,
    alt: `${product.name} press-on nail set`,
    ratio: "portrait",
    url: null,
  };
}

/**
 * Maps a catalogue row to the public view model.
 *
 * Takes no currency argument: the store has exactly one, so there is nothing for
 * a caller to choose and no way for a visitor's page and an admin list to
 * disagree about how a price reads.
 */
export function toProductView(
  row: ProductRow,
  imageRows: ProductImageRow[],
): CatalogueProduct {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    descriptor: row.descriptor,
    price: formatPrice(row.price_minor),
    ...(row.tag === null ? {} : { tag: row.tag }),
    // An unassigned product has no collection to name or link to. Empty strings
    // rather than null keep the `string` shape every consumer already expects;
    // the product page renders "Shop" instead of a collection crumb for these.
    collectionSlug: row.collections?.slug ?? "",
    collectionName: row.collections?.title ?? "",
    shape: row.shape,
    length: asLength(row.default_length),
    finish: row.finish,
    description: row.description,
    included: row.included,
    images: toImageViews(row, imageRows),
    imagePlaceholder: {
      label: `${row.name} Set`,
      sublabel: PRODUCT_PLACEHOLDER_SUBLABEL,
      alt: `${row.name} press-on nail set`,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Pure selectors over an already-visibility-filtered catalogue                */
/* -------------------------------------------------------------------------- */

export function collectionBySlug(
  collections: CatalogueCollection[],
  slug: string,
): CatalogueCollection | undefined {
  return collections.find((collection) => collection.slug === slug);
}

export function productBySlug(
  products: CatalogueProduct[],
  slug: string,
): CatalogueProduct | undefined {
  return products.find((product) => product.slug === slug);
}

export function productsInCollection(
  products: CatalogueProduct[],
  collectionSlug: string,
): CatalogueProduct[] {
  return products.filter((product) => product.collectionSlug === collectionSlug);
}

/**
 * Related products, preserving the pre-integration behaviour exactly: products
 * from the same collection first, otherwise catalogue order.
 */
export function relatedProducts(
  products: CatalogueProduct[],
  currentSlug: string,
  limit = 4,
): CatalogueProduct[] {
  const current = productBySlug(products, currentSlug);
  if (!current) return products.slice(0, limit);

  return products
    .filter((product) => product.slug !== currentSlug)
    .sort((a) => (a.collectionSlug === current.collectionSlug ? -1 : 1))
    .slice(0, limit);
}
