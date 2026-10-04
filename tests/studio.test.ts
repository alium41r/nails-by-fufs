import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyCollectionDraft,
  applyProductDraft,
  baseToStudioImages,
  draftPlaceholder,
  formatPrice,
  isBlobUrl,
  moveImage,
  normalizeStudioImages,
  parseCataloguePrice,
  parsePrice,
  PRICE_PLACEHOLDER,
  removeStudioImage,
  replaceStudioImage,
  revokeBlobUrl,
  studioToCatalogueImages,
  validateImageFile,
  withImageAlt,
} from "@/lib/studio/derive";
import { countPendingDrafts, stripBlobUrls, studioStore } from "@/lib/studio/store";
import { hasOpenStudioOverlay, resetStudioOverlays, trackStudioOverlay } from "@/lib/studio/overlay";
import type { CatalogueCollection, CatalogueProduct } from "@/lib/catalogue";
import type { StudioImage, StudioState } from "@/lib/studio/types";

const mockProduct: CatalogueProduct = {
  id: "prod-1",
  slug: "noir-velvet",
  name: "Noir Velvet",
  descriptor: "Deep Berry Velvet Set",
  price: "USD 45.00",
  tag: "New",
  collectionSlug: "core-edit",
  collectionName: "Core Edit",
  shape: "Almond",
  length: "Medium",
  finish: "Velvet Matte",
  description: "Handcrafted press-on nails.",
  included: ["10 Handcrafted press-on nails", "Prep kit"],
  images: [
    {
      id: "img-1",
      label: "Noir Velvet Set",
      sublabel: "4:5 • PRODUCT SHOT",
      alt: "Noir Velvet press-on nails",
      ratio: "portrait",
      url: "https://example.com/img1.jpg",
    },
  ],
  imagePlaceholder: {
    label: "Noir Velvet Set",
    sublabel: "4:5 • PRODUCT SHOT",
    alt: "Noir Velvet press-on nails",
  },
};

const mockCollection: CatalogueCollection = {
  slug: "core-edit",
  title: "Core Edit",
  subtitle: "Studio Essentials",
  description: "Curated press-on collection.",
  tag: "Featured Series",
  featured: true,
  coverImageUrl: "https://example.com/cover.jpg",
  imagePlaceholder: {
    label: "Core Edit Lookbook",
    sublabel: "COLLECTION ARCHIVE",
    alt: "Core Edit visual presentation",
  },
};

describe("Studio Mode: Price parsing & formatting", () => {
  it("parses numeric strings into minor units", () => {
    expect(parsePrice("45")).toEqual({ priceMinor: 4500, currency: "USD" });
    expect(parsePrice("45.50")).toEqual({ priceMinor: 4550, currency: "USD" });
    expect(parsePrice("0")).toEqual({ priceMinor: 0, currency: "USD" });
  });

  it("extracts currency symbols and codes", () => {
    expect(parsePrice("$48.00")).toEqual({ priceMinor: 4800, currency: "USD" });
    expect(parsePrice("CAD 55")).toEqual({ priceMinor: 5500, currency: "CAD" });
    expect(parsePrice("£35.00")).toEqual({ priceMinor: 3500, currency: "GBP" });
    expect(parsePrice("€40.00")).toEqual({ priceMinor: 4000, currency: "EUR" });
  });

  it("handles unpriced and empty inputs as unpriced", () => {
    expect(parsePrice("")).toEqual({ priceMinor: null, currency: "USD" });
    expect(parsePrice("   ")).toEqual({ priceMinor: null, currency: "USD" });
    expect(parsePrice(PRICE_PLACEHOLDER)).toEqual({ priceMinor: null, currency: "USD" });
  });

  it("formats prices correctly or returns placeholder", () => {
    expect(formatPrice(4500, "USD")).toBe("USD 45.00");
    expect(formatPrice(1250, "CAD")).toBe("CAD 12.50");
    expect(formatPrice(null, "USD")).toBe(PRICE_PLACEHOLDER);
    expect(formatPrice(undefined, "USD")).toBe(PRICE_PLACEHOLDER);
    expect(formatPrice(4500, null)).toBe(PRICE_PLACEHOLDER);
  });
});

describe("Studio Mode: Draft application", () => {
  it("merges product draft without mutating base product", () => {
    const draft = {
      name: "Noir Velvet Deluxe",
      priceMinor: 5500,
      currency: "USD",
      shape: "Coffin",
      length: "Long" as const,
      tag: "Bestseller",
      isActive: true,
      featured: true,
    };

    const merged = applyProductDraft(mockProduct, draft);

    expect(merged.name).toBe("Noir Velvet Deluxe");
    expect(merged.price).toBe("USD 55.00");
    expect(merged.shape).toBe("Coffin");
    expect(merged.length).toBe("Long");
    expect(merged.tag).toBe("Bestseller");
    expect(merged.featured).toBe(true);
    expect(merged.isDraft).toBe(true);
    expect(merged.isUnpriced).toBe(false);

    // Verify original object wasn't mutated
    expect(mockProduct.name).toBe("Noir Velvet");
    expect(mockProduct.shape).toBe("Almond");
  });

  it("correctly identifies unpriced product in drafts", () => {
    const unpricedDraft = {
      priceMinor: null,
      currency: "USD",
    };
    const merged = applyProductDraft(mockProduct, unpricedDraft);
    expect(merged.price).toBe(PRICE_PLACEHOLDER);
    expect(merged.isUnpriced).toBe(true);
  });

  it("merges collection draft correctly", () => {
    const draft = {
      title: "Core Edit 2026",
      subtitle: "Updated Studio Silhouettes",
      featured: false,
    };

    const merged = applyCollectionDraft(mockCollection, draft);
    expect(merged.title).toBe("Core Edit 2026");
    expect(merged.subtitle).toBe("Updated Studio Silhouettes");
    expect(merged.featured).toBe(false);
    expect(merged.isDraft).toBe(true);
  });
});

describe("Studio Mode: Image conversions", () => {
  it("converts catalogue images to studio images and back", () => {
    const studioImages = baseToStudioImages(mockProduct);
    expect(studioImages.length).toBe(1);
    expect(studioImages[0].isPrimary).toBe(true);
    expect(studioImages[0].url).toBe("https://example.com/img1.jpg");

    const reordered: StudioImage[] = [
      {
        id: "img-2",
        url: "https://example.com/new.jpg",
        alt: "New photo",
        isPrimary: true,
        sortOrder: 0,
        ratio: "portrait",
      },
      ...studioImages.map((img) => ({ ...img, isPrimary: false, sortOrder: 1 })),
    ];

    const catalogueViews = studioToCatalogueImages(reordered, "Noir Velvet");
    expect(catalogueViews.length).toBe(2);
    expect(catalogueViews[0].id).toBe("img-2");
    expect(catalogueViews[1].id).toBe("img-1");
  });

  it("provides fallback placeholder when all images are removed", () => {
    const views = studioToCatalogueImages([], "Custom Set");
    expect(views.length).toBe(1);
    expect(views[0].url).toBeNull();
    // The old "Set Set" doubling for a name that already ends in "Set".
    expect(views[0].label).toBe("Custom Set");
  });
});

describe("Studio Mode: Validation and store counts", () => {
  it("validates allowed file extensions and sizes", () => {
    const validFile = new File(["dummy"], "photo.png", { type: "image/png" });
    expect(validateImageFile(validFile).valid).toBe(true);

    const invalidType = new File(["dummy"], "doc.pdf", { type: "application/pdf" });
    expect(validateImageFile(invalidType).valid).toBe(false);
  });

  it("accurately counts pending drafts", () => {
    const state: StudioState = {
      isActive: true,
      isPreviewMode: false,
      activePanel: null,
      productDrafts: { "prod-1": { name: "Test" }, "prod-2": { shape: "Oval" } },
      collectionDrafts: { "core-edit": { title: "New Title" } },
      productImages: {},
      savedAt: {},
    };

    expect(countPendingDrafts(state)).toBe(3);
  });
});

/* -------------------------------------------------------------------------- */
/* Pass 2 regressions                                                          */
/* -------------------------------------------------------------------------- */

const image = (overrides: Partial<StudioImage> & { id: string }): StudioImage => ({
  url: `https://example.com/${overrides.id}.jpg`,
  alt: `${overrides.id} alt`,
  isPrimary: false,
  sortOrder: 0,
  ratio: "portrait",
  ...overrides,
});

describe("Studio Mode: catalogue price parsing (revert path)", () => {
  it("reads the documented `CUR 00.00` catalogue format", () => {
    expect(parseCataloguePrice("USD 45.00")).toEqual({
      priceMinor: 4500,
      currency: "USD",
      amount: "45.00",
    });
    expect(parseCataloguePrice("CAD 12.50")).toEqual({
      priceMinor: 1250,
      currency: "CAD",
      amount: "12.50",
    });
    // Regression: the revert button used to strip non-digits and produce "4500".
    expect(parseCataloguePrice("USD 45.00").amount).not.toBe("4500");
  });

  it("treats the placeholder and unparseable values as unpriced", () => {
    for (const value of [PRICE_PLACEHOLDER, "$XX", "", "   ", "Ask us"]) {
      expect(parseCataloguePrice(value)).toEqual({
        priceMinor: null,
        currency: null,
        amount: "",
      });
    }
  });

  it("survives a round trip through parsePrice", () => {
    const base = parseCataloguePrice("USD 45.00");
    const reparsed = parsePrice(base.amount, base.currency ?? "USD");
    expect(reparsed).toEqual({ priceMinor: 4500, currency: "USD" });
    expect(formatPrice(reparsed.priceMinor, reparsed.currency)).toBe("USD 45.00");
  });
});

describe("Studio Mode: gallery mutations keep their invariants", () => {
  const three = [
    image({ id: "a", isPrimary: true, sortOrder: 0 }),
    image({ id: "b", sortOrder: 1 }),
    image({ id: "c", sortOrder: 2 }),
  ];

  it("reorders and keeps sortOrder/primary aligned to list position", () => {
    const moved = moveImage(three, "c", "up");
    expect(moved.map((i) => i.id)).toEqual(["a", "c", "b"]);
    expect(moved.map((i) => i.sortOrder)).toEqual([0, 1, 2]);
    expect(moved.map((i) => i.isPrimary)).toEqual([true, false, false]);
  });

  it("returns the identical array for no-op moves and unknown ids", () => {
    expect(moveImage(three, "a", "up")).toBe(three);
    expect(moveImage(three, "c", "down")).toBe(three);
    expect(moveImage(three, "missing", "up")).toBe(three);
  });

  it("promotes a new primary when the primary is removed", () => {
    const remaining = removeStudioImage(three, "a");
    expect(remaining.map((i) => i.id)).toEqual(["b", "c"]);
    expect(remaining[0].isPrimary).toBe(true);
    expect(remaining[1].isPrimary).toBe(false);
    expect(remaining.map((i) => i.sortOrder)).toEqual([0, 1]);
  });

  it("falls back to an empty list when the last image is removed", () => {
    expect(removeStudioImage([three[0]], "a")).toEqual([]);
  });

  it("keeps id, position and primary flag when a photo is replaced", () => {
    const replaced = replaceStudioImage(three, "b", "blob:new");
    expect(replaced.map((i) => i.id)).toEqual(["a", "b", "c"]);
    expect(replaced[1].url).toBe("blob:new");
    expect(replaced[1].isPrimary).toBe(false);
    expect(replaced.map((i) => i.isPrimary)).toEqual([true, false, false]);
  });

  it("returns the identical array when replacing or removing nothing", () => {
    expect(replaceStudioImage(three, "missing", "blob:x")).toBe(three);
    expect(removeStudioImage(three, "missing")).toBe(three);
  });

  it("only writes an alt text that actually changed", () => {
    const updated = withImageAlt(three, "b", "new alt");
    expect(updated[1].alt).toBe("new alt");
    expect(updated[0]).toBe(three[0]);
    expect(withImageAlt(three, "b", "b alt")).toBe(three);
    expect(withImageAlt(three, "missing", "x")).toBe(three);
  });

  it("normalises an unordered list back to the position invariant", () => {
    const messy = [
      image({ id: "a", isPrimary: false, sortOrder: 7 }),
      image({ id: "b", isPrimary: true, sortOrder: 3 }),
    ];
    const fixed = normalizeStudioImages(messy);
    expect(fixed[0]).toMatchObject({ id: "a", isPrimary: true, sortOrder: 0 });
    expect(fixed[1]).toMatchObject({ id: "b", isPrimary: false, sortOrder: 1 });
  });

  it("does not mutate the array it is given", () => {
    const before = three.map((i) => ({ ...i }));
    moveImage(three, "c", "up");
    removeStudioImage(three, "a");
    normalizeStudioImages(three);
    expect(three).toEqual(before);
  });
});

describe("Studio Mode: draft-aware placeholder labels", () => {
  it("renames the placeholder when the draft renames the product", () => {
    const placeholder = draftPlaceholder(mockProduct, "Noir Velvet Deluxe");
    expect(placeholder.label).toBe("Noir Velvet Deluxe Set");
    expect(placeholder.alt).toBe("Noir Velvet Deluxe press-on nail set");
  });

  it("does not double the word Set", () => {
    expect(draftPlaceholder(mockProduct, "Custom Set").label).toBe("Custom Set");
  });

  it("leaves the catalogue placeholder untouched without a rename", () => {
    expect(draftPlaceholder(mockProduct)).toBe(mockProduct.imagePlaceholder);
    expect(draftPlaceholder(mockProduct, "  ")).toBe(mockProduct.imagePlaceholder);
  });

  it("flows the renamed placeholder through applyProductDraft", () => {
    const merged = applyProductDraft(mockProduct, { name: "Renamed" });
    expect(merged.imagePlaceholder.label).toBe("Renamed Set");
    expect(merged.name).toBe("Renamed");
  });
});

describe("Studio Mode: object URL lifecycle", () => {
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  let created: string[];
  let revoked: string[];

  beforeEach(() => {
    created = [];
    revoked = [];
    let counter = 0;
    URL.createObjectURL = vi.fn(() => {
      const url = `blob:test-${++counter}`;
      created.push(url);
      return url;
    }) as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn((url: string) => {
      revoked.push(url);
    }) as typeof URL.revokeObjectURL;
  });

  afterEach(() => {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    studioStore.resetAllDrafts();
    studioStore.setActive(false);
  });

  it("classifies blob and Storage URLs apart", () => {
    expect(isBlobUrl("blob:abc")).toBe(true);
    expect(isBlobUrl("https://cdn.example.com/a.jpg")).toBe(false);
    expect(isBlobUrl(null)).toBe(false);
    expect(isBlobUrl(undefined)).toBe(false);
  });

  it("revokes only blob URLs and tolerates repeat calls", () => {
    revokeBlobUrl("blob:test-x");
    revokeBlobUrl("https://cdn.example.com/a.jpg");
    revokeBlobUrl(null);
    revokeBlobUrl("blob:test-x");
    expect(revoked).toEqual(["blob:test-x", "blob:test-x"]);
  });

  it("releases the preview URL when an image is replaced", () => {
    const first = "blob:test-replace-me";
    studioStore.setProductImages("prod-1", [image({ id: "a", url: first })]);
    studioStore.updateProductImages("prod-1", (images) =>
      replaceStudioImage(images, "a", "blob:test-new")
    );
    expect(revoked).toContain(first);
    expect(studioStore.getSnapshot().productImages["prod-1"][0].url).toBe("blob:test-new");
  });

  it("releases every preview URL when the drafts are discarded", () => {
    studioStore.setProductImages("prod-1", [
      image({ id: "a", url: "blob:test-1" }),
      image({ id: "b", url: "blob:test-2" }),
    ]);
    studioStore.updateProductImages("prod-1", () => []);
    expect(revoked).toEqual(["blob:test-1", "blob:test-2"]);
  });

  it("never revokes a real Storage URL", () => {
    studioStore.setProductImages("prod-1", [
      image({ id: "a", url: "https://cdn.example.com/keep.jpg" }),
    ]);
    studioStore.resetProductDraft("prod-1");
    expect(revoked).toEqual([]);
  });
});

describe("Studio Mode: atomic image store updates", () => {
  afterEach(() => {
    studioStore.resetAllDrafts();
    studioStore.setActive(false);
  });

  it("applies two same-tick edits without losing either", () => {
    studioStore.setProductImages("prod-1", [
      image({ id: "a", isPrimary: true, sortOrder: 0 }),
      image({ id: "b", sortOrder: 1 }),
      image({ id: "c", sortOrder: 2 }),
    ]);

    // Both updaters run before React re-renders: a captured render value would
    // have made the second write discard the first.
    studioStore.updateProductImages("prod-1", (images) => moveImage(images, "c", "up"));
    studioStore.updateProductImages("prod-1", (images) => moveImage(images, "c", "up"));

    const result = studioStore.getSnapshot().productImages["prod-1"];
    expect(result.map((i) => i.id)).toEqual(["c", "a", "b"]);
    expect(result.map((i) => i.sortOrder)).toEqual([0, 1, 2]);
  });

  it("skips a write that produces an identical list", () => {
    const initial = [image({ id: "a", isPrimary: true })];
    studioStore.setProductImages("prod-1", initial);
    const before = studioStore.getSnapshot();

    studioStore.updateProductImages("prod-1", (images) => images);
    expect(studioStore.getSnapshot()).toBe(before);
  });

  it("counts image drafts towards the pending total", () => {
    studioStore.setProductImages("prod-1", [image({ id: "a", isPrimary: true })]);
    expect(countPendingDrafts(studioStore.getSnapshot())).toBe(1);
  });
});

describe("Studio Mode: blob URLs never reach session storage", () => {
  it("keeps a typed cover URL but strips a local blob preview", () => {
    const blobDraft = stripBlobUrls({
      "core-edit": { coverImageUrl: "blob:local-file", title: "Core Edit" },
    }) as Record<string, Record<string, unknown>>;

    expect(blobDraft["core-edit"].coverImageUrl).toBeNull();
    expect(blobDraft["core-edit"].title).toBe("Core Edit");

    const urlDraft = stripBlobUrls({
      "core-edit": { coverImageUrl: "https://cdn.example.com/cover.jpg" },
    }) as Record<string, Record<string, unknown>>;

    expect(urlDraft["core-edit"].coverImageUrl).toBe("https://cdn.example.com/cover.jpg");
  });

  it("returns the identical object when there is nothing to strip", () => {
    const drafts = { "prod-1": { name: "Noir Velvet" } };
    expect(stripBlobUrls(drafts)).toBe(drafts);
  });

  it("drops blob entries from a persisted list field", () => {
    const cleaned = stripBlobUrls({
      "prod-1": { included: ["Kit", "blob:leaked"] },
    }) as Record<string, Record<string, unknown>>;

    expect(cleaned["prod-1"].included).toEqual(["Kit"]);
  });

  // The restore-on-load half of this rule is covered in tests/studio-session.test.ts,
  // which owns the single `initStudioClient()` call the store module allows.
});

describe("Studio Mode: overlay Escape ownership", () => {
  afterEach(() => {
    resetStudioOverlays();
  });

  it("reports an open overlay and releases it exactly once", () => {
    expect(hasOpenStudioOverlay()).toBe(false);

    const drawer = trackStudioOverlay();
    expect(hasOpenStudioOverlay()).toBe(true);

    const confirm = trackStudioOverlay();
    expect(hasOpenStudioOverlay()).toBe(true);

    confirm();
    expect(hasOpenStudioOverlay()).toBe(true);

    drawer();
    expect(hasOpenStudioOverlay()).toBe(false);

    // A double release must not push the counter negative.
    drawer();
    confirm();
    expect(hasOpenStudioOverlay()).toBe(false);
  });
});
