import { Product, products } from "@/data/products";

export interface SearchOptions {
  query?: string;
  collection?: string;
  shape?: string;
  length?: string;
  sortBy?: "featured" | "newest" | "name";
}

/**
 * Pure, deterministic search and filter utility for local product catalog.
 * Searches only across fields existing in the current product model.
 */
export function searchProducts(options: SearchOptions = {}): Product[] {
  const {
    query = "",
    collection = "all",
    shape = "all",
    length = "all",
    sortBy = "featured",
  } = options;

  const trimmedQuery = query.trim().toLowerCase();
  const queryTokens = trimmedQuery ? trimmedQuery.split(/\s+/).filter(Boolean) : [];

  const filtered = products.filter((product) => {
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

      const matchesAllTokens = queryTokens.every((token) =>
        searchableFields.includes(token)
      );

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
      return 0; // preserve catalog order
    }
    // "featured" sorting: "Featured" tag first, then "New", then catalog order
    const aPriority = a.tag === "Featured" ? 2 : a.tag === "New" ? 1 : 0;
    const bPriority = b.tag === "Featured" ? 2 : b.tag === "New" ? 1 : 0;
    if (aPriority !== bPriority) return bPriority - aPriority;
    return 0; // preserve catalog order
  });
}

/**
 * Returns distinct nail shapes present in the local product catalog.
 */
export function getAvailableShapes(): string[] {
  return Array.from(new Set(products.map((p) => p.shape)));
}

/**
 * Returns distinct nail lengths present in the local product catalog.
 */
export function getAvailableLengths(): string[] {
  return Array.from(new Set(products.map((p) => p.length)));
}

/**
 * Manually curated discovery terms corresponding to actual product and collection data.
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
