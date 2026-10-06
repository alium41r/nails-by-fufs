import { describe, expect, it } from "vitest";

import {
  PUBLIC_COLLECTION_FILTER,
  PUBLIC_PRODUCT_FILTER,
  productBySlug,
  productsInCollection,
  relatedProducts,
  toCollectionView,
  toImageViews,
  toProductView,
  type CollectionRow,
  type ProductImageRow,
  type ProductRow,
} from "@/lib/catalogue";
import { getAvailableLengths, getAvailableShapes, searchProducts } from "@/lib/search";

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                    */
/* -------------------------------------------------------------------------- */

function productRow(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    id: "id-glazed-truffle",
    slug: "glazed-truffle",
    name: "Glazed Truffle",
    descriptor: "Almond • Soft Gloss Finish",
    description: "A rich, creamy taupe glaze.",
    shape: "Almond",
    default_length: "Medium",
    finish: "Soft Gloss",
    tag: "New",
    included: ["10 custom-fit press-on nails"],
    price_minor: null,
    currency: null,
    collections: { slug: "core-edit", title: "The Core Edit" },
    ...overrides,
  };
}

function imageRow(overrides: Partial<ProductImageRow> = {}): ProductImageRow {
  return {
    id: "img-1",
    product_id: "id-glazed-truffle",
    storage_path: "products/glazed-truffle/primary.jpg",
    alt_text: "Glazed Truffle primary nail set presentation",
    sort_order: 0,
    is_primary: false,
    ...overrides,
  };
}

/* -------------------------------------------------------------------------- */
/* Visibility contract                                                         */
/* -------------------------------------------------------------------------- */

describe("public visibility contract", () => {
  it("only exposes active, unarchived collections", () => {
    expect(PUBLIC_COLLECTION_FILTER).toEqual({ is_active: true, archived_at: null });
  });

  it("requires a published product in a published parent collection", () => {
    // The privilege boundary that replaces RLS for this connection. If this
    // filter is ever weakened, an unpublished product, an archived product, or a
    // product inside a hidden collection would leak to the storefront.
    //
    // Archiving is enforced *only* here: `archived_at` has no RLS policy, because
    // RLS cannot express "invisible to clients but listable by the admin through
    // the same privileged connection".
    expect(PUBLIC_PRODUCT_FILTER).toEqual({
      is_active: true,
      archived_at: null,
      collections: { is: { is_active: true, archived_at: null } },
    });
  });

  it("does not publish a product with no collection", () => {
    // `collection_id` became nullable so a product can exist before it is filed.
    // The relation filter must treat "no collection" as "not published" rather
    // than throwing or passing it through.
    const filter = PUBLIC_PRODUCT_FILTER.collections as { is: { is_active: boolean } };
    expect(filter.is.is_active).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* Mapping                                                                     */
/* -------------------------------------------------------------------------- */

describe("toProductView", () => {
  it("maps database columns onto the storefront view shape", () => {
    const view = toProductView(productRow(), []);

    expect(view).toMatchObject({
      id: "id-glazed-truffle",
      slug: "glazed-truffle",
      name: "Glazed Truffle",
      descriptor: "Almond • Soft Gloss Finish",
      collectionSlug: "core-edit",
      collectionName: "The Core Edit",
      shape: "Almond",
      length: "Medium",
      finish: "Soft Gloss",
      tag: "New",
      included: ["10 custom-fit press-on nails"],
    });
  });

  it("shows the PKR price placeholder while a set has no price", () => {
    expect(toProductView(productRow({ price_minor: null, currency: null }), []).price).toBe("PKR XX");
  });

  it("formats a real price in PKR", () => {
    expect(toProductView(productRow({ price_minor: 4500, currency: "PKR" }), []).price).toBe(
      "PKR 45.00",
    );
  });

  it("omits the tag instead of rendering null", () => {
    const view = toProductView(productRow({ tag: null }), []);
    expect("tag" in view).toBe(false);
  });

  it("narrows unexpected lengths onto a supported value", () => {
    expect(toProductView(productRow({ default_length: "Long" }), []).length).toBe("Long");
    expect(toProductView(productRow({ default_length: "Short" }), []).length).toBe("Short");
    expect(toProductView(productRow({ default_length: "Xxl" }), []).length).toBe("Medium");
  });
});

describe("image views", () => {
  it("derives a single placeholder when the database holds no images", () => {
    const views = toImageViews(productRow(), []);

    expect(views).toHaveLength(1);
    expect(views[0]).toMatchObject({
      id: "placeholder-id-glazed-truffle",
      label: "Glazed Truffle Set",
      alt: "Glazed Truffle press-on nail set",
      ratio: "portrait",
    });
  });

  it("orders real images primary-first, then by sort_order", () => {
    const views = toImageViews(productRow(), [
      imageRow({ id: "b", sort_order: 2 }),
      imageRow({ id: "primary", sort_order: 9, is_primary: true }),
      imageRow({ id: "a", sort_order: 1 }),
    ]);

    expect(views.map((image) => image.id)).toEqual(["primary", "a", "b"]);
  });

  it("uses stored alt text when present and never invents a fallback path", () => {
    const [withAlt] = toImageViews(productRow(), [imageRow({ id: "x", alt_text: "Real alt" })]);
    expect(withAlt.alt).toBe("Real alt");

    const [withoutAlt] = toImageViews(productRow(), [imageRow({ id: "y", alt_text: "" })]);
    expect(withoutAlt.alt).toBe("Glazed Truffle press-on nail set");

    const placeholder = toImageViews(productRow(), [])[0];
    expect(JSON.stringify(placeholder)).not.toContain("jpg");
  });
});

describe("toCollectionView", () => {
  it("maps a collection row and derives its placeholder copy", () => {
    const row: CollectionRow = {
      cover_image_path: null,
      slug: "raw-earth",
      title: "Raw Earth Series",
      subtitle: "Warm Terracotta & Grounded Matte",
      description: "Warm clay tones.",
      tag: null,
      featured: false,
    };
    const view = toCollectionView(row);

    expect(view).toMatchObject({
      slug: "raw-earth",
      title: "Raw Earth Series",
      featured: false,
      imagePlaceholder: { label: "Raw Earth Series Lookbook" },
    });
    expect("tag" in view).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* Selectors over a visibility-filtered catalogue                              */
/* -------------------------------------------------------------------------- */

describe("catalogue selectors", () => {
  const catalogue = [
    toProductView(productRow({ slug: "glazed-truffle", name: "Glazed Truffle" }), []),
    toProductView(
      productRow({ slug: "blush-chrome", name: "Blush Chrome", tag: "Featured" }),
      [],
    ),
    toProductView(
      productRow({
        slug: "smoked-quartz",
        name: "Smoked Quartz",
        tag: null,
        collections: { slug: "season-01", title: "Season 01 — Cherry & Velvet" },
      }),
      [],
    ),
  ];

  it("scopes products to their collection", () => {
    expect(productsInCollection(catalogue, "core-edit").map((p) => p.slug)).toEqual([
      "glazed-truffle",
      "blush-chrome",
    ]);
    expect(productsInCollection(catalogue, "season-01").map((p) => p.slug)).toEqual([
      "smoked-quartz",
    ]);
  });

  it("returns undefined for an unknown slug, so pages can 404", () => {
    expect(productBySlug(catalogue, "does-not-exist")).toBeUndefined();
  });

  it("keeps same-collection products first in related products", () => {
    const related = relatedProducts(catalogue, "glazed-truffle", 4);
    expect(related.map((p) => p.slug)).not.toContain("glazed-truffle");
    expect(related[0]?.collectionSlug).toBe("core-edit");
  });
});

/* -------------------------------------------------------------------------- */
/* Search / filter behaviour (must match pre-integration behaviour)            */
/* -------------------------------------------------------------------------- */

describe("searchProducts", () => {
  const catalogue = [
    toProductView(productRow({ slug: "glazed-truffle", name: "Glazed Truffle", tag: "New" }), []),
    toProductView(
      productRow({ slug: "blush-chrome", name: "Blush Chrome", tag: "Featured", shape: "Almond", default_length: "Short" }),
      [],
    ),
    toProductView(
      productRow({
        slug: "smoked-quartz",
        name: "Smoked Quartz",
        tag: null,
        shape: "Stiletto",
        default_length: "Long",
        collections: { slug: "season-01", title: "Season 01 — Cherry & Velvet" },
      }),
      [],
    ),
  ];

  it("sorts featured tags first, then new, then catalogue order", () => {
    expect(searchProducts(catalogue, { sortBy: "featured" }).map((p) => p.slug)).toEqual([
      "blush-chrome",
      "glazed-truffle",
      "smoked-quartz",
    ]);
  });

  it("sorts newest by the New tag and alphabetically by name", () => {
    expect(searchProducts(catalogue, { sortBy: "newest" }).map((p) => p.slug)).toEqual([
      "glazed-truffle",
      "blush-chrome",
      "smoked-quartz",
    ]);
    expect(searchProducts(catalogue, { sortBy: "name" }).map((p) => p.name)).toEqual([
      "Blush Chrome",
      "Glazed Truffle",
      "Smoked Quartz",
    ]);
  });

  it("matches every query token across product and collection fields", () => {
    expect(searchProducts(catalogue, { query: "glazed" }).map((p) => p.slug)).toEqual([
      "glazed-truffle",
    ]);
    expect(searchProducts(catalogue, { query: "cherry velvet" }).map((p) => p.slug)).toEqual([
      "smoked-quartz",
    ]);
    expect(searchProducts(catalogue, { query: "stiletto" }).map((p) => p.slug)).toEqual([
      "smoked-quartz",
    ]);
    expect(searchProducts(catalogue, { query: "nonsense" })).toEqual([]);
  });

  it("applies collection, shape and length filters case-insensitively", () => {
    expect(searchProducts(catalogue, { collection: "season-01" }).map((p) => p.slug)).toEqual([
      "smoked-quartz",
    ]);
    expect(
      searchProducts(catalogue, { shape: "almond", sortBy: "name" }).map((p) => p.slug),
    ).toEqual(["blush-chrome", "glazed-truffle"]);
    expect(searchProducts(catalogue, { length: "SHORT" }).map((p) => p.slug)).toEqual([
      "blush-chrome",
    ]);
  });

  it("does not mutate the catalogue it is given", () => {
    const order = catalogue.map((p) => p.slug);
    searchProducts(catalogue, { sortBy: "name" });
    expect(catalogue.map((p) => p.slug)).toEqual(order);
  });

  it("derives filter options from the supplied catalogue", () => {
    expect(getAvailableShapes(catalogue)).toEqual(["Almond", "Stiletto"]);
    expect(getAvailableLengths(catalogue)).toEqual(["Medium", "Short", "Long"]);
  });
});
