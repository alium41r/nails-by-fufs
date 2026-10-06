import Link from "next/link";

import { requireAdmin } from "@/lib/admin/auth";
import { getPrisma } from "@/lib/prisma/db";
import { isPriced, pricePlaceholder, STORE_CURRENCY } from "@/lib/currency";
import { AdminPageHeader, AdminSegmentedNav } from "@/components/admin/ui/primitives";
import { AdminButton } from "@/components/admin/ui/controls";
import { CatalogueProducts } from "@/components/admin/catalogue/CatalogueProducts";
import { CatalogueCollections } from "@/components/admin/catalogue/CatalogueCollections";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Catalogue — Studio Control Center",
  robots: { index: false, follow: false },
};

export type CatalogueTab = "products" | "collections" | "media";
export type CatalogueFilter = "all" | "published" | "draft" | "attention" | "archived";
export type CatalogueSort = "order" | "name" | "price" | "updated";

const TABS: CatalogueTab[] = ["products", "collections", "media"];
const FILTERS: CatalogueFilter[] = ["all", "published", "draft", "attention", "archived"];
const SORTS: CatalogueSort[] = ["order", "name", "price", "updated"];

function oneOf<T extends string>(values: T[], value: string | undefined, fallback: T): T {
  return values.includes(value as T) ? (value as T) : fallback;
}

export interface CatalogueProductRow {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  featured: boolean;
  displayOrder: number | null;
  archived: boolean;
  collectionId: string | null;
  collectionTitle: string | null;
  priced: boolean;
  priceLabel: string;
  imagePath: string | null;
  imageCount: number;
  updatedAt: string;
  /** Every unmet condition, most important first. The list shows the first one. */
  issues: string[];
}

export interface CatalogueCollectionRow {
  id: string;
  title: string;
  slug: string;
  isActive: boolean;
  featured: boolean;
  displayOrder: number | null;
  coverPath: string | null;
  archived: boolean;
  productCount: number;
}

/**
 * The catalogue workspace.
 *
 * ## Why this is a route of its own
 *
 * `/admin` previously *was* the catalogue: a full list of every product and
 * collection, plus four operational counters and a Studio Mode banner, all on the
 * landing page. Opening the admin meant being handed the entire inventory before
 * being told what actually needed doing.
 *
 * The catalogue is a place you go to work, so it is now its own workspace at
 * `/admin/catalogue`, and `/admin` is an overview that only surfaces what needs
 * attention.
 *
 * ## Why the three tabs
 *
 * Products, collections and media are three different jobs with three different
 * row shapes. Showing them stacked on one page (as before) meant the collections
 * list was pushed below a potentially long product list, and the missing-content
 * work was invisible. Each tab is a real URL, so it can be bookmarked and shared.
 *
 * All three are computed from the same two queries, so switching tabs costs one
 * indexed read rather than one per tab.
 */
export default async function AdminCataloguePage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    filter?: string;
    sort?: string;
    collection?: string;
    /** Only used by the media tab. */
    missing?: string;
  }>;
}) {
  await requireAdmin("/admin/catalogue");
  const params = await searchParams;

  const tab = oneOf(TABS, params.tab, "products");
  const query = (params.q ?? "").trim();
  const filter = oneOf(FILTERS, params.filter, "all");
  const sort = oneOf(SORTS, params.sort, "order");
  const collectionFilter = params.collection ?? "";
  const missingFilter = params.missing ?? "";

  const prisma = getPrisma();

  const [collections, products] = await Promise.all([
    prisma.collections.findMany({
      orderBy: [{ display_order: { sort: "asc", nulls: "last" } }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        is_active: true,
        featured: true,
        display_order: true,
        cover_image_path: true,
        archived_at: true,
        _count: { select: { products: true } },
      },
    }),
    prisma.products.findMany({
      orderBy: [{ display_order: { sort: "asc", nulls: "last" } }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        price_minor: true,
        currency: true,
        is_active: true,
        featured: true,
        display_order: true,
        archived_at: true,
        collection_id: true,
        updated_at: true,
        collections: { select: { id: true, title: true, is_active: true, archived_at: true } },
      },
    }),
  ]);

  // Image counts and the first image come from one extra query: the partial unique
  // index on product_images makes Prisma model products -> product_images as 1:1,
  // so relation `_count` is not available.
  const imageRows = products.length
    ? await prisma.product_images.findMany({
        where: { product_id: { in: products.map((product) => product.id) } },
        orderBy: [{ is_primary: "desc" }, { sort_order: "asc" }],
        select: { product_id: true, storage_path: true },
      })
    : [];

  const imagesByProduct = new Map<string, { count: number; first: string }>();
  for (const row of imageRows) {
    const existing = imagesByProduct.get(row.product_id);
    if (existing) existing.count += 1;
    else imagesByProduct.set(row.product_id, { count: 1, first: row.storage_path });
  }

  /**
   * Builds the display row, collapsing every problem into an ordered list.
   *
   * Order matters: "No price" blocks a sale outright, "Collection hidden" hides
   * the product from the storefront, and "Not published" is a deliberate state the
   * owner may have chosen. Presenting them in that order means the single status a
   * row shows is the one worth acting on.
   */
  const productRows: CatalogueProductRow[] = products.map((product) => {
    const images = imagesByProduct.get(product.id);
    const priced = isPriced(product.price_minor);
    const archived = product.archived_at !== null;
    const hiddenCollection = product.collections
      ? !product.collections.is_active || product.collections.archived_at !== null
      : false;

    const issues: string[] = [];
    if (!archived) {
      if (!priced) issues.push("No price");
      if (!images || images.count === 0) issues.push("No photo");
      if (product.collection_id === null) issues.push("No collection");
      else if (hiddenCollection) issues.push("Collection hidden");
      if (!product.is_active) issues.push("Not published");
    }

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      isActive: product.is_active,
      featured: product.featured,
      displayOrder: product.display_order,
      archived,
      collectionId: product.collection_id,
      collectionTitle: product.collections?.title ?? null,
      priced,
      priceLabel: priced
        ? `${STORE_CURRENCY} ${((product.price_minor ?? 0) / 100).toFixed(2)}`
        : pricePlaceholder(),
      imagePath: images?.first ?? null,
      imageCount: images?.count ?? 0,
      updatedAt: product.updated_at.toISOString(),
      issues,
    };
  });

  const collectionRows: CatalogueCollectionRow[] = collections.map((collection) => ({
    id: collection.id,
    title: collection.title,
    slug: collection.slug,
    isActive: collection.is_active,
    featured: collection.featured,
    displayOrder: collection.display_order,
    coverPath: collection.cover_image_path,
    archived: collection.archived_at !== null,
    productCount: collection._count.products,
  }));

  const needle = query.toLowerCase();
  const matchesQuery = (row: { name: string; slug: string }) =>
    needle.length === 0 ||
    row.name.toLowerCase().includes(needle) ||
    row.slug.toLowerCase().includes(needle);

  const matchesFilter = (row: CatalogueProductRow) => {
    switch (filter) {
      case "published":
        return !row.archived && row.isActive;
      case "draft":
        return !row.archived && !row.isActive;
      case "attention":
        return !row.archived && row.issues.length > 0;
      case "archived":
        return row.archived;
      default:
        // "all" is the working catalogue; archived rows have their own view.
        return !row.archived;
    }
  };

  const filtered = productRows.filter(
    (row) =>
      matchesQuery(row) &&
      matchesFilter(row) &&
      (collectionFilter === "" ||
        (collectionFilter === "none"
          ? row.collectionId === null
          : row.collectionId === collectionFilter)),
  );

  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case "name":
        return a.name.localeCompare(b.name);
      case "price":
        // Priced first (they are sellable), then alphabetical: the amounts are in
        // mixed currencies, so sorting by numeric value would be meaningless.
        return Number(b.priced) - Number(a.priced) || a.name.localeCompare(b.name);
      case "updated":
        return b.updatedAt.localeCompare(a.updatedAt);
      default:
        return (
          (a.displayOrder ?? Number.MAX_SAFE_INTEGER) -
            (b.displayOrder ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name)
        );
    }
  });

  const visible = productRows.filter((row) => !row.archived);
  const counts = {
    all: visible.length,
    published: visible.filter((row) => row.isActive).length,
    draft: visible.filter((row) => !row.isActive).length,
    attention: visible.filter((row) => row.issues.length > 0).length,
    archived: productRows.filter((row) => row.archived).length,
  };

  const base = "/admin/catalogue";
  const tabHref = (next: CatalogueTab) => {
    const search = new URLSearchParams();
    if (next !== "products") search.set("tab", next);
    if (query) search.set("q", query);
    if (filter !== "all") search.set("filter", filter);
    if (sort !== "order") search.set("sort", sort);
    if (collectionFilter) search.set("collection", collectionFilter);
    const qs = search.toString();
    return qs ? `${base}?${qs}` : base;
  };

  const activeCollections = collectionRows.filter((row) => !row.archived);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Catalogue"
        description="Your sets and collections. Open a row to edit everything about it."
        count={`${counts.all} product${counts.all === 1 ? "" : "s"} · ${collectionRows.length} collection${collectionRows.length === 1 ? "" : "s"}${
          counts.attention > 0 ? ` · ${counts.attention} need attention` : ""
        }`}
        actions={
          <Link href="/admin/products/new">
            <AdminButton variant="primary">Add product</AdminButton>
          </Link>
        }
      />

      <AdminSegmentedNav
        items={[
          { label: "Products", href: tabHref("products"), active: tab === "products", count: counts.all },
          {
            label: "Collections",
            href: tabHref("collections"),
            active: tab === "collections",
            count: collectionRows.length,
          },
          { label: "Missing content", href: tabHref("media"), active: tab === "media", count: counts.attention },
        ]}
      />

      {tab === "products" && (
        <CatalogueProducts
          products={sorted}
          counts={counts}
          query={query}
          filter={filter}
          sort={sort}
          collection={collectionFilter}
          collections={activeCollections.map((row) => ({ id: row.id, title: row.title }))}
        />
      )}

      {tab === "collections" && (
        <CatalogueCollections
          collections={collectionRows}
          query={query}
          productCounts={productRows}
        />
      )}

      {tab === "media" && (
        <CatalogueProducts
          products={sorted.filter((row) => row.issues.length > 0)}
          counts={counts}
          query={query}
          filter="attention"
          sort={sort}
          collection={collectionFilter}
          collections={activeCollections.map((row) => ({ id: row.id, title: row.title }))}
          missing={missingFilter}
          attentionOnly
        />
      )}
    </div>
  );
}
