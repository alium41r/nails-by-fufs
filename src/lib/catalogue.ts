import type { Prisma } from "@/generated/prisma/client";

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
 */

/* -------------------------------------------------------------------------- */
/* Visibility filters (the security contract)                                  */
/* -------------------------------------------------------------------------- */

export const PUBLIC_COLLECTION_FILTER = {
  is_active: true,
} as const satisfies Prisma.collectionsWhereInput;

export const PUBLIC_PRODUCT_FILTER = {
  is_active: true,
  collections: { is_active: true },
} as const satisfies Prisma.productsWhereInput;

/* -------------------------------------------------------------------------- */
/* Presentation constants                                                      */
/* -------------------------------------------------------------------------- */

/**
 * No verified price exists in the project yet, so the storefront keeps showing
 * the same placeholder it showed before the catalogue was database-backed.
 * The database stores no price at all (`price_minor` / `currency` are NULL).
 */
const PRICE_PLACEHOLDER = "$XX";
const PRODUCT_PLACEHOLDER_SUBLABEL = "4:5 • PRODUCT SHOT";
const COLLECTION_PLACEHOLDER_SUBLABEL = "COLLECTION ARCHIVE";

export type PlaceholderRatio = "portrait" | "square" | "classic";

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
}

export interface CatalogueCollection {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  tag?: string;
  featured: boolean;
  imagePlaceholder: CataloguePlaceholder;
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
  collections: { slug: string; title: string };
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

function formatPrice(priceMinor: number | null, currency: string | null): string {
  if (priceMinor === null || currency === null) return PRICE_PLACEHOLDER;

  return `${currency} ${(priceMinor / 100).toFixed(2)}`;
}

export function toCollectionView(row: CollectionRow): CatalogueCollection {
  return {
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    ...(row.tag === null ? {} : { tag: row.tag }),
    featured: row.featured,
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
    }));
}

function primaryPlaceholderImage(product: ProductRow): CatalogueImage {
  return {
    id: `placeholder-${product.id}`,
    label: `${product.name} Set`,
    sublabel: PRODUCT_PLACEHOLDER_SUBLABEL,
    alt: `${product.name} press-on nail set`,
    ratio: "portrait",
  };
}

export function toProductView(row: ProductRow, imageRows: ProductImageRow[]): CatalogueProduct {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    descriptor: row.descriptor,
    price: formatPrice(row.price_minor, row.currency),
    ...(row.tag === null ? {} : { tag: row.tag }),
    collectionSlug: row.collections.slug,
    collectionName: row.collections.title,
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
