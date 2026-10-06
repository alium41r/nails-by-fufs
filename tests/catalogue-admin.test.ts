import { describe, expect, it } from "vitest";

import {
  MAX_TAG_LENGTH,
  describeCollectionWriteError,
  describeProductWriteError,
  isTooLong,
  normalizeOptionalText,
  optionalText,
  parseDisplayOrder,
  parseIncluded,
  parsePricePair,
  toCollectionCore,
  toProductCore,
  validateCollectionCore,
  validateProductCore,
} from "@/lib/admin/catalogue-validation";
import { isVersionToken } from "@/lib/admin/version-token-shape";
import {
  managementToCatalogueView,
  managementToCollectionView,
  normalizeManagedImages,
} from "@/lib/studio/derive";
import type {
  StudioCollectionManagement,
  StudioProductManagement,
} from "@/lib/admin/studio-management";

/**
 * The shared catalogue write layer.
 *
 * Both the admin forms and Studio Mode call these, so a regression here would
 * change what either surface is allowed to persist.
 */

describe("catalogue validation: price", () => {
  it("treats an empty price as unpriced, with no currency", () => {
    expect(parsePricePair("")).toEqual({ ok: true, priceMinor: null, currency: null });
  });

  it("accepts a price and always stores it as PKR", () => {
    expect(parsePricePair("4500")).toEqual({ ok: true, priceMinor: 4500, currency: "PKR" });
    expect(parsePricePair("0")).toEqual({ ok: true, priceMinor: 0, currency: "PKR" });
  });

  it("rejects non-integer and negative prices", () => {
    expect(parsePricePair("45.5").ok).toBe(false);
    expect(parsePricePair("-1").ok).toBe(false);
    expect(parsePricePair("nonsense").ok).toBe(false);
  });
});

describe("catalogue validation: display order", () => {
  it("reads empty as no explicit order", () => {
    expect(parseDisplayOrder("")).toBeNull();
    expect(parseDisplayOrder("   ")).toBeNull();
    expect(parseDisplayOrder(null)).toBeNull();
    expect(parseDisplayOrder(undefined)).toBeNull();
  });

  it("accepts integers in both the form and the editor shape", () => {
    expect(parseDisplayOrder("3")).toBe(3);
    expect(parseDisplayOrder(3)).toBe(3);
    // Studio's editor may already hold a parsed number.
    expect(parseDisplayOrder("0")).toBe(0);
  });

  it("rejects fractions and non-numeric text", () => {
    expect(parseDisplayOrder("3.5")).toBe("invalid");
    expect(parseDisplayOrder("later")).toBe("invalid");
    expect(parseDisplayOrder(3.5)).toBe("invalid");
  });
});

describe("catalogue validation: optional text", () => {
  it("turns empty input into null and marks over-length values", () => {
    const form = new FormData();
    form.set("tag", "");
    expect(optionalText(form, "tag", MAX_TAG_LENGTH)).toBeNull();

    form.set("tag", "x".repeat(MAX_TAG_LENGTH + 1));
    const tooLong = optionalText(form, "tag", MAX_TAG_LENGTH);
    expect(isTooLong(tooLong)).toBe(true);
  });

  it("normalises a plain value the way the editor sends it", () => {
    expect(normalizeOptionalText("  New  ", MAX_TAG_LENGTH)).toEqual({ ok: true, value: "New" });
    expect(normalizeOptionalText("", MAX_TAG_LENGTH)).toEqual({ ok: true, value: null });
    expect(normalizeOptionalText(null, MAX_TAG_LENGTH)).toEqual({ ok: true, value: null });
    expect(normalizeOptionalText("x".repeat(MAX_TAG_LENGTH + 1), MAX_TAG_LENGTH).ok).toBe(false);
  });

  it("splits included items on newlines and drops blanks", () => {
    expect(parseIncluded("One\n\n  Two  \n")).toEqual(["One", "Two"]);
    expect(parseIncluded("")).toEqual([]);
  });
});

describe("catalogue validation: product core", () => {
  const valid = {
    slug: "noir-velvet",
    name: "Noir Velvet",
    descriptor: "d",
    description: "x",
    shape: "Almond",
    defaultLength: "Medium",
    finish: "High Gloss",
    tag: null,
    displayOrder: 1 as number | null | "invalid",
    included: [],
  };

  it("accepts a well-formed product", () => {
    expect(validateProductCore(valid)).toEqual([]);
    expect(toProductCore(valid).defaultLength).toBe("Medium");
  });

  it("requires a name, a valid slug and a shape", () => {
    expect(validateProductCore({ ...valid, name: "" }).length).toBe(1);
    expect(validateProductCore({ ...valid, name: "x".repeat(201) }).length).toBe(1);
    expect(validateProductCore({ ...valid, slug: "Not A Slug" }).length).toBe(1);
    expect(validateProductCore({ ...valid, shape: "" }).length).toBe(1);
  });

  it("restricts the default length to the three stored values", () => {
    expect(validateProductCore({ ...valid, defaultLength: "Extra Long" }).length).toBe(1);
    expect(validateProductCore({ ...valid, defaultLength: "Short" })).toEqual([]);
    expect(validateProductCore({ ...valid, defaultLength: "Long" })).toEqual([]);
  });
});

describe("catalogue validation: collection core", () => {
  const valid = {
    slug: "core-edit",
    title: "Core Edit",
    subtitle: "s",
    description: "d",
    tag: null,
    displayOrder: null as number | null | "invalid",
  };

  it("accepts a well-formed collection", () => {
    expect(validateCollectionCore(valid)).toEqual([]);
    expect(toCollectionCore(valid).displayOrder).toBeNull();
  });

  it("requires a title and a valid slug", () => {
    expect(validateCollectionCore({ ...valid, title: "" }).length).toBe(1);
    expect(validateCollectionCore({ ...valid, slug: "-bad-" }).length).toBe(1);
  });
});

describe("catalogue validation: database error translation", () => {
  it("recognises the constraint names the migrations create", () => {
    expect(describeProductWriteError('duplicate key value violates unique constraint "products_slug_key"')).toContain(
      "already used",
    );
    expect(describeCollectionWriteError('violates check constraint "collections_slug_format"')).toContain(
      "lowercase",
    );
    expect(describeProductWriteError("something else entirely")).toContain("could not be saved");
  });
});

describe("concurrency token shape", () => {
  it("accepts the microsecond form the server emits", () => {
    expect(isVersionToken("2026-10-04T17:13:49.923896Z")).toBe(true);
    expect(isVersionToken("2026-10-04T17:13:49.923Z")).toBe(true);
  });

  it("rejects anything else, including the values a stale client might send", () => {
    for (const value of [
      "",
      "null",
      "2026-10-04 17:13:49+00",
      "2026-10-04T17:13:49Z",
      "2026-13-04T17:13:49.000000Z",
      1759598029923,
      null,
      undefined,
    ]) {
      expect(isVersionToken(value)).toBe(false);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Management projection                                                       */
/* -------------------------------------------------------------------------- */

const product: StudioProductManagement = {
  id: "2b1e3f5a-0000-4000-8000-000000000001",
  slug: "glazed-truffle",
  collectionId: "2b1e3f5a-0000-4000-8000-0000000000c1",
  collectionSlug: "core-edit",
  name: "Glazed Truffle",
  descriptor: "Milky Neutral Set",
  description: "A soft neutral glaze.",
  shape: "Almond",
  defaultLength: "Medium",
  finish: "High Gloss",
  tag: "New",
  included: ["Ten nails"],
  priceMinor: 4550,
  isActive: false,
  featured: true,
  displayOrder: 4,
  updatedAt: "2026-10-04T17:13:49.923896Z",
  images: [
    {
      id: "img-b",
      url: "https://cdn.example.com/b.jpg",
      alt: "second",
      isPrimary: false,
      sortOrder: 1,
      ratio: "square",
    },
    {
      id: "img-a",
      url: "https://cdn.example.com/a.jpg",
      alt: "cover",
      isPrimary: true,
      sortOrder: 0,
      ratio: "portrait",
    },
  ],
};

const collection: StudioCollectionManagement = {
  id: "2b1e3f5a-0000-4000-8000-0000000000c1",
  slug: "core-edit",
  title: "The Core Edit",
  subtitle: "Neutrals",
  description: "Everyday tones.",
  tag: null,
  isActive: false,
  featured: true,
  displayOrder: 1,
  coverImageUrl: "https://cdn.example.com/cover.jpg",
  hasCover: true,
  updatedAt: "2026-10-04T17:13:49.923896Z",
};

describe("management projection", () => {
  it("carries the authoritative values the public view model omits", () => {
    const view = managementToCatalogueView(product);
    // These are the fields a UI default would otherwise guess at.
    expect(view.isActive).toBe(false);
    expect(view.featured).toBe(true);
    expect(view.displayOrder).toBe(4);
    expect(view.price).toBe("PKR 45.50");
  });

  it("orders the gallery primary-first and derives labels from the real name", () => {
    const view = managementToCatalogueView(product);
    expect(view.images.map((image) => image.id)).toEqual(["img-a", "img-b"]);
    expect(view.images[0].label).toBe("Glazed Truffle Set");
    expect(view.images[1].label).toBe("Glazed Truffle Detail 2");
    expect(view.images[0].alt).toBe("cover");
  });

  it("falls back to a single placeholder when a product has no photography", () => {
    const view = managementToCatalogueView({ ...product, images: [] });
    expect(view.images).toHaveLength(1);
    expect(view.images[0].url).toBeNull();
  });

  it("keeps an empty tag out of the view model rather than storing an empty string", () => {
    const view = managementToCatalogueView({ ...product, tag: null });
    expect(view.tag).toBeUndefined();
  });

  it("projects a collection with its real visibility and cover", () => {
    const view = managementToCollectionView(collection);
    expect(view.isActive).toBe(false);
    expect(view.featured).toBe(true);
    expect(view.coverImageUrl).toBe("https://cdn.example.com/cover.jpg");
    expect(view.tag).toBeUndefined();
  });

  it("normalises a managed gallery into the editor invariant", () => {
    const images = normalizeManagedImages(product.images);
    expect(images.map((image) => image.id)).toEqual(["img-a", "img-b"]);
    expect(images[0].isPrimary).toBe(true);
    expect(images[0].sortOrder).toBe(0);
  });
});
