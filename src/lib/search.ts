import type { CatalogueProduct } from "@/lib/catalogue";

export interface SearchOptions {
  query?: string;
  collection?: string;
  shape?: string;
  length?: string;
  sortBy?: "featured" | "newest" | "name";
}

/**
 * Pure, deterministic search and filter utility over an already
 * visibility-filtered catalogue. The caller supplies the products (loaded
 * server-side from Prisma), so this stays a plain function with no data source
 * of its own — and it is unit-testable without a database.
 *
 * Behaviour is unchanged from the pre-integration implementation: multi-token
 * matching, the same field set, and the same ordering rules.
 */
export function searchProducts(
  catalogue: CatalogueProduct[],
  options: SearchOptions = {},
): CatalogueProduct[] {
  const {
    query = "",
    collection = "all",
    shape = "all",
    length = "all",
    sortBy = "featured",
  } = options;

  const trimmedQuery = query.trim().toLowerCase();
  const queryTokens = trimmedQuery ? trimmedQuery.split(/\s+/).filter(Boolean) : [];

  const filtered = catalogue.filter((product) => {
    // 1. Multi-token text matching across existing product fields
    if (queryTokens.length > 0) {
      const searchableFields = [
        product.name,
        product.descriptor,
        product.description,
        product.collectionName,
        product.collectionSlug,
        product.shape,
        product.length,
        product.finish,
        product.tag || "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesAllTokens = queryTokens.every((token) => searchableFields.includes(token));

      if (!matchesAllTokens) return false;
    }

    // 2. Collection filter
    if (collection && collection !== "all" && product.collectionSlug !== collection) {
      return false;
    }

    // 3. Shape filter
    if (shape && shape !== "all" && product.shape.toLowerCase() !== shape.toLowerCase()) {
      return false;
    }

    // 4. Length filter
    if (length && length !== "all" && product.length.toLowerCase() !== length.toLowerCase()) {
      return false;
    }

    return true;
  });

  // 5. Deterministic sorting based on existing metadata
  return filtered.sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === "newest") {
      const aIsNew = a.tag === "New" ? 1 : 0;
      const bIsNew = b.tag === "New" ? 1 : 0;
      if (aIsNew !== bIsNew) return bIsNew - aIsNew;
      return 0; // preserve catalogue order
    }
    // "featured" sorting: "Featured" tag first, then "New", then catalogue order
    const aPriority = a.tag === "Featured" ? 2 : a.tag === "New" ? 1 : 0;
    const bPriority = b.tag === "Featured" ? 2 : b.tag === "New" ? 1 : 0;
    if (aPriority !== bPriority) return bPriority - aPriority;
    return 0; // preserve catalogue order
  });
}

/**
 * Returns distinct nail shapes present in the supplied catalogue.
 */
export function getAvailableShapes(catalogue: CatalogueProduct[]): string[] {
  return Array.from(new Set(catalogue.map((product) => product.shape)));
}

/**
 * Returns distinct nail lengths present in the supplied catalogue.
 */
export function getAvailableLengths(catalogue: CatalogueProduct[]): string[] {
  return Array.from(new Set(catalogue.map((product) => product.length)));
}

/**
 * Manually curated discovery terms corresponding to actual product and
 * collection data. This is editorial UI copy, not catalogue content, so it stays
 * in code rather than in the database.
 */
export function getDiscoveryTags(): string[] {
  return [
    "The Core Edit",
    "Season 01",
    "Almond",
    "Short Square",
    "Glazed",
    "Cherry",
    "Velvet",
    "Sheer Pearl",
  ];
}
