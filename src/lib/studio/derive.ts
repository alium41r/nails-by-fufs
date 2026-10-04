import type {
  CatalogueCollection,
  CatalogueImage,
  CatalogueProduct,
  PlaceholderRatio,
} from "@/lib/catalogue";
import type {
  StudioCollectionManagement,
  StudioProductManagement,
} from "@/lib/admin/studio-management";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/admin/paths";
import type {
  CollectionDraft,
  MergedCollection,
  MergedProduct,
  ProductDraft,
  StudioImage,
} from "./types";

export const PRICE_PLACEHOLDER = "$XX";

/**
 * Revokes a locally created object URL.
 *
 * Safe to call with real Storage URLs and at any time: only `blob:` values are
 * touched, and a URL that was already released is ignored. Every local file
 * preview in Studio Mode funnels through here so no blob (and its file data)
 * outlives the session that created it.
 */
export function revokeBlobUrl(url: string | null | undefined) {
  if (typeof url !== "string" || !url.startsWith("blob:")) return;
  if (typeof URL === "undefined" || typeof URL.revokeObjectURL !== "function") return;
  try {
    URL.revokeObjectURL(url);
  } catch {
    // already revoked or unsupported
  }
}

/** True when a value is a local `blob:` preview rather than a real Storage URL. */
export function isBlobUrl(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("blob:");
}

/**
 * Parses user input price like "$45", "45.00", "CAD 50", "35" into minor units and currency code.
 */
export function parsePrice(
  input: string,
  fallbackCurrency = "USD"
): { priceMinor: number | null; currency: string } {
  const trimmed = input.trim();
  if (!trimmed || trimmed === PRICE_PLACEHOLDER) {
    return { priceMinor: null, currency: fallbackCurrency };
  }

  // Extract currency letters if present (e.g. "USD", "CAD", "EUR", "£", "€", "$")
  let currency = fallbackCurrency;
  let numericPart = trimmed;

  if (trimmed.startsWith("$")) {
    currency = "USD";
    numericPart = trimmed.slice(1);
  } else if (trimmed.startsWith("£")) {
    currency = "GBP";
    numericPart = trimmed.slice(1);
  } else if (trimmed.startsWith("€")) {
    currency = "EUR";
    numericPart = trimmed.slice(1);
  } else {
    const match = trimmed.match(/^([A-Za-z]{3})\s*(.*)$/);
    if (match) {
      currency = match[1].toUpperCase();
      numericPart = match[2];
    }
  }

  const cleaned = numericPart.replace(/[^0-9.]/g, "");
  if (!cleaned) {
    return { priceMinor: null, currency };
  }

  const val = parseFloat(cleaned);
  if (isNaN(val) || val < 0) {
    return { priceMinor: null, currency };
  }

  return {
    priceMinor: Math.round(val * 100),
    currency,
  };
}

/** Formats minor units into customer display string. */
export function formatPrice(
  priceMinor: number | null | undefined,
  currency: string | null | undefined
): string {
  if (priceMinor === null || priceMinor === undefined || !currency) {
    return PRICE_PLACEHOLDER;
  }
  return `${currency} ${(priceMinor / 100).toFixed(2)}`;
}

/**
 * Builds the "awaiting photography" placeholder for a possibly-renamed product.
 *
 * Guards against the doubled label the naive `\`${name} Set\`` produced for a
 * product whose name already ends in "Set" (e.g. "Custom Set Set").
 */
export function draftPlaceholder(
  base: CatalogueProduct,
  name?: string
): CatalogueProduct["imagePlaceholder"] {
  const effectiveName = (name ?? base.name).trim() || base.name;
  if (effectiveName === base.name) return base.imagePlaceholder;

  return {
    ...base.imagePlaceholder,
    label: /\bset\b/i.test(effectiveName) ? effectiveName : `${effectiveName} Set`,
    alt: `${effectiveName} press-on nail set`,
  };
}

/** Builds the fallback placeholder image used when a product has no photography. */
function placeholderImage(productName: string): CatalogueImage {
  const slug = productName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return {
    id: `placeholder-${slug || "product"}`,
    label: /\bset\b/i.test(productName) ? productName : `${productName} Set`,
    sublabel: "4:5 • PRODUCT SHOT",
    alt: `${productName} press-on nail set`,
    ratio: "portrait",
    url: null,
  };
}

/**
 * Converts an authoritative management gallery into editor image drafts.
 *
 * Unlike {@link baseToStudioImages} this reads real persisted metadata — the
 * stored `sort_order`, the real `is_primary` flag and the stored alt text — so
 * opening the image manager shows what the database holds rather than a
 * placeholder-derived guess. Studio's gallery invariant is that the primary
 * image is also first, which the server writes together; the list is ordered the
 * same way to keep the two views identical.
 */
export function normalizeManagedImages(
  images: readonly {
    id: string;
    url: string | null;
    alt: string;
    isPrimary: boolean;
    sortOrder: number;
    ratio: PlaceholderRatio;
  }[],
): StudioImage[] {
  return [...images]
    .sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.id.localeCompare(b.id);
    })
    .map((image, index) => ({
      id: image.id,
      url: image.url,
      alt: image.alt || `Product photograph ${index + 1}`,
      isPrimary: image.isPrimary,
      sortOrder: image.sortOrder,
      ratio: image.ratio,
    }));
}

/** Converts base product's catalogue images into StudioImage format. */
export function baseToStudioImages(product: CatalogueProduct): StudioImage[] {
  if (!product.images || product.images.length === 0) {
    return [];
  }

  return product.images.map((img, idx) => ({
    id: img.id,
    url: img.url,
    alt: img.alt || `${product.name} nail image`,
    isPrimary: idx === 0,
    sortOrder: idx,
    ratio: img.ratio || (idx === 0 ? "portrait" : "square"),
    label: img.label,
    sublabel: img.sublabel,
  }));
}

/** Converts StudioImage list back to CatalogueImage list for gallery consumption. */
export function studioToCatalogueImages(
  studioImages: StudioImage[],
  productName: string
): CatalogueImage[] {
  if (!studioImages || studioImages.length === 0) {
    return [placeholderImage(productName)];
  }

  return [...studioImages]
    .sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    })
    .map((img, index) => ({
      id: img.id,
      label: img.label || (index === 0 ? `${productName} Set` : `${productName} Detail ${index + 1}`),
      sublabel: img.sublabel || (img.isPrimary ? "4:5 • PRODUCT SHOT" : `SHOT ${index + 1}`),
      alt: img.alt || `${productName} photo ${index + 1}`,
      ratio: img.ratio || (index === 0 ? "portrait" : "square"),
      url: img.url,
    }));
}

/**
 * Projects an authoritative management record into the customer-facing shape.
 *
 * Studio Mode renders the *same* server component tree the public sees, so the
 * editor needs a `CatalogueProduct` to merge a draft onto. Building that from the
 * management record rather than from the visitor projection is what makes the
 * editor show real `is_active` / `featured` values and the real stored gallery:
 * the public view model deliberately has none of them, and defaulting them in
 * the UI is exactly how an unpriced or unpublished product gets published by
 * accident.
 */
export function managementToCatalogueView(
  product: StudioProductManagement,
): CatalogueProduct & { isActive: boolean; featured: boolean; displayOrder: number | null } {
  const name = product.name;
  const images: CatalogueImage[] =
    product.images.length > 0
      ? normalizeManagedImages(product.images).map((image, index) => ({
          id: image.id,
          label: index === 0 ? `${name} Set` : `${name} Detail ${index + 1}`,
          sublabel: image.isPrimary ? "4:5 • PRODUCT SHOT" : `SHOT ${index + 1}`,
          alt: image.alt,
          ratio: image.ratio,
          url: image.url,
        }))
      : [placeholderImage(name)];

  return {
    id: product.id,
    slug: product.slug,
    name,
    descriptor: product.descriptor,
    price: formatPrice(product.priceMinor, product.currency),
    ...(product.tag === null ? {} : { tag: product.tag }),
    collectionSlug: product.collectionSlug,
    collectionName: product.collectionSlug,
    shape: product.shape,
    length: product.defaultLength,
    finish: product.finish,
    description: product.description,
    included: product.included,
    images,
    imagePlaceholder: {
      label: /\bset\b/i.test(name) ? name : `${name} Set`,
      sublabel: "4:5 • PRODUCT SHOT",
      alt: `${name} press-on nail set`,
    },
    isActive: product.isActive,
    featured: product.featured,
    displayOrder: product.displayOrder,
  };
}

/** Same projection for a collection. */
export function managementToCollectionView(
  collection: StudioCollectionManagement,
): CatalogueCollection & { isActive: boolean; displayOrder: number | null } {
  return {
    slug: collection.slug,
    title: collection.title,
    subtitle: collection.subtitle,
    description: collection.description,
    ...(collection.tag === null ? {} : { tag: collection.tag }),
    featured: collection.featured,
    coverImageUrl: collection.coverImageUrl,
    imagePlaceholder: {
      label: `${collection.title} Lookbook`,
      sublabel: "COLLECTION ARCHIVE",
      alt: `${collection.title} lookbook visual presentation`,
    },
    isActive: collection.isActive,
    displayOrder: collection.displayOrder,
  };
}

/**
 * Merges a base product with any active Studio Draft.
 *
 * `base` should already be the management projection when one is available
 * (see `useStudioProduct`), so untouched fields show persisted values.
 */
export function applyProductDraft(
  base: CatalogueProduct,
  draft?: ProductDraft,
  images?: StudioImage[]
): MergedProduct {
  const isDraft = Boolean(
    draft || (images && images.length > 0) || "isActive" in base,
  );
  const effectiveImages = images ? studioToCatalogueImages(images, draft?.name || base.name) : base.images;

  let formattedPrice = base.price;
  let isUnpriced = base.price === PRICE_PLACEHOLDER;

  if (draft?.priceMinor !== undefined) {
    if (draft.priceMinor === null || !draft.currency) {
      formattedPrice = PRICE_PLACEHOLDER;
      isUnpriced = true;
    } else {
      formattedPrice = formatPrice(draft.priceMinor, draft.currency);
      isUnpriced = false;
    }
  }

  const management = base as Partial<{
    isActive: boolean;
    featured: boolean;
    displayOrder: number | null;
  }>;

  return {
    ...base,
    name: draft?.name ?? base.name,
    descriptor: draft?.descriptor ?? base.descriptor,
    description: draft?.description ?? base.description,
    price: formattedPrice,
    tag: draft?.tag !== undefined ? (draft.tag.trim() || undefined) : base.tag,
    shape: draft?.shape ?? base.shape,
    length: draft?.length ?? base.length,
    finish: draft?.finish ?? base.finish,
    included: draft?.included ?? base.included,
    images: effectiveImages,
    imagePlaceholder: draftPlaceholder(base, draft?.name),
    // Authoritative values when the management projection supplied them; the
    // defaults only apply to a visitor bundle, where nothing is editable.
    isActive: draft?.isActive ?? management.isActive ?? true,
    featured: draft?.featured ?? management.featured ?? false,
    displayOrder:
      draft?.displayOrder !== undefined ? draft.displayOrder : (management.displayOrder ?? null),
    isUnpriced,
    isDraft,
  };
}

/** Merges a base collection with any active Studio Draft. */
export function applyCollectionDraft(
  base: CatalogueCollection,
  draft?: CollectionDraft
): MergedCollection {
  const isDraft = Boolean(draft);

  const management = base as Partial<{
    isActive: boolean;
    displayOrder: number | null;
  }>;

  return {
    ...base,
    title: draft?.title ?? base.title,
    subtitle: draft?.subtitle ?? base.subtitle,
    description: draft?.description ?? base.description,
    tag: draft?.tag !== undefined ? (draft.tag.trim() || undefined) : base.tag,
    coverImageUrl: draft?.coverImageUrl !== undefined ? draft.coverImageUrl : base.coverImageUrl,
    featured: draft?.featured !== undefined ? draft.featured : base.featured,
    isActive: draft?.isActive ?? management.isActive ?? true,
    displayOrder:
      draft?.displayOrder !== undefined ? draft.displayOrder : (management.displayOrder ?? null),
    isDraft,
  };
}

/** Validates image file type and byte size against admin rules. */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file format (${file.type || "unknown"}). Please upload PNG, JPG, WebP, GIF, or HEIC.`,
    };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File is too large (${mb}MB). Maximum allowed size is 10MB.`,
    };
  }

  return { valid: true };
}

/**
 * Reads the editable price out of a catalogue price string such as
 * `"USD 45.00"`, `"$XX"` or `"$45"`.
 *
 * Used to pre-fill and to revert the editor, so it parses the same documented
 * format the server produces in `src/lib/catalogue.ts` instead of a
 * digits-only strip that turned `"USD 45.00"` into `4500`.
 */
export function parseCataloguePrice(price: string): {
  priceMinor: number | null;
  currency: string | null;
  amount: string;
} {
  const trimmed = price.trim();
  if (!trimmed || trimmed === PRICE_PLACEHOLDER) {
    return { priceMinor: null, currency: null, amount: "" };
  }

  const match = trimmed.match(/^([A-Za-z]{3})?\s*([0-9]+(?:\.[0-9]+)?)$/);
  if (!match) {
    return { priceMinor: null, currency: null, amount: "" };
  }

  const currency = match[1] ? match[1].toUpperCase() : null;
  const amount = match[2];
  const value = Number.parseFloat(amount);
  if (!Number.isFinite(value) || value < 0) {
    return { priceMinor: null, currency, amount: "" };
  }

  return { priceMinor: Math.round(value * 100), currency, amount };
}

/**
 * Reconciles a stored image draft against a locally added file.
 *
 * Returns the same array when nothing changed so the store's identity check can
 * skip a re-render (alt text fires on every blur).
 */
export function withImageAlt(
  images: StudioImage[],
  imageId: string,
  alt: string
): StudioImage[] {
  let changed = false;
  const next = images.map((image) => {
    if (image.id !== imageId || image.alt === alt) return image;
    changed = true;
    return { ...image, alt };
  });
  return changed ? next : images;
}

/** Moves one image within the list, returning the same array for no-op moves. */
export function moveImage(
  images: StudioImage[],
  imageId: string,
  direction: "up" | "down"
): StudioImage[] {
  const index = images.findIndex((image) => image.id === imageId);
  if (index === -1) return images;

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= images.length) return images;

  const next = [...images];
  const [moved] = next.splice(index, 1);
  next.splice(targetIndex, 0, moved);
  return normalizeStudioImages(next);
}

/**
 * Normalises gallery order after any structural image edit.
 *
 * `sortOrder` follows list position and the first image owns the primary flag,
 * which is the invariant the B8A server actions expect on save. Returns the same
 * array when it is already normal so callers can rely on identity checks.
 */
export function normalizeStudioImages(images: StudioImage[]): StudioImage[] {
  if (images.length === 0) return images;

  let changed = false;
  const next = images.map((image, index) => {
    const isPrimary = index === 0;
    if (image.sortOrder === index && image.isPrimary === isPrimary) return image;
    changed = true;
    return { ...image, sortOrder: index, isPrimary };
  });

  return changed ? next : images;
}

/** Removing an image never leaves the gallery without a primary. */
export function removeStudioImage(images: StudioImage[], imageId: string): StudioImage[] {
  const next = images.filter((image) => image.id !== imageId);
  if (next.length === images.length) return images;
  return normalizeStudioImages(next);
}

/** Replacing a photo keeps its id, position and primary flag. */
export function replaceStudioImage(
  images: StudioImage[],
  imageId: string,
  url: string,
  file?: File
): StudioImage[] {
  let changed = false;
  const next = images.map((image) => {
    if (image.id !== imageId) return image;
    changed = true;
    return { ...image, url, file: file ?? image.file };
  });
  return changed ? next : images;
}
