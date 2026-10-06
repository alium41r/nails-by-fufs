import type { CatalogueProduct, CatalogueCollection, PlaceholderRatio } from "@/lib/catalogue";

export interface ProductDraft {
  name?: string;
  descriptor?: string;
  description?: string;
  /** Minor units (paisa), or null for "no price". The currency is always PKR. */
  priceMinor?: number | null;
  shape?: string;
  length?: "Short" | "Medium" | "Long";
  finish?: string;
  tag?: string;
  included?: string[];
  isActive?: boolean;
  featured?: boolean;
  displayOrder?: number | null;
}

export interface CollectionDraft {
  title?: string;
  subtitle?: string;
  description?: string;
  tag?: string;
  coverImageUrl?: string | null;
  isActive?: boolean;
  featured?: boolean;
  displayOrder?: number | null;
}

export interface StudioImage {
  id: string;
  url: string | null;
  alt: string;
  isPrimary: boolean;
  sortOrder: number;
  ratio: PlaceholderRatio;
  label?: string;
  sublabel?: string;
  file?: File;
}

export type StudioPanelTarget =
  | { type: "product"; id: string; focusField?: string }
  | { type: "collection"; slug: string; focusField?: string }
  | { type: "images"; productId: string; focusField?: string }
  /**
   * An owner-managed `site_content` document, addressed by its dotted key.
   *
   * Kept in the same union as the catalogue targets so the panel, the overlay
   * tracker and the "close editor" flow need no second mechanism.
   */
  | { type: "content"; key: string; focusField?: string };

export interface StudioState {
  isActive: boolean;
  isPreviewMode: boolean;
  activePanel: StudioPanelTarget | null;
  productDrafts: Record<string, ProductDraft>;
  collectionDrafts: Record<string, CollectionDraft>;
  productImages: Record<string, StudioImage[]>;
  savedAt: Record<string, number>;
}

export interface StudioSaveResult {
  success: boolean;
  /** Always true once wired: the result describes a completed server round trip. */
  persisted: boolean;
  message?: string;
  /**
   * Set when the server refused the write because the record changed since the
   * draft was loaded. The UI must tell the owner to reload rather than implying
   * a transient failure, and the local draft is kept so nothing is lost.
   */
  conflict?: boolean;
  /** True for "not signed in as an admin" — distinct from a data error. */
  unauthorized?: boolean;
}

export interface StudioAdapter {
  saveProduct(
    productId: string,
    draft: ProductDraft,
    expectedUpdatedAt: string,
  ): Promise<StudioSaveResult>;
  saveCollection(
    collectionId: string,
    draft: CollectionDraft,
    expectedUpdatedAt: string,
  ): Promise<StudioSaveResult>;
  uploadImage(
    productId: string,
    file: File,
    replacingImageId?: string,
  ): Promise<StudioSaveResult & { image?: StudioImage }>;
  replaceImage(
    productId: string,
    imageId: string,
    file: File,
  ): Promise<StudioSaveResult & { url?: string }>;
  deleteImage(productId: string, imageId: string): Promise<StudioSaveResult>;
  setPrimaryImage(productId: string, imageId: string): Promise<StudioSaveResult>;
  reorderImages(productId: string, imageIds: string[]): Promise<StudioSaveResult>;
  updateImageAlt(productId: string, imageId: string, alt: string): Promise<StudioSaveResult>;
  uploadCover(
    collectionId: string,
    file: File,
    expectedUpdatedAt: string,
  ): Promise<StudioSaveResult & { url?: string }>;
  removeCover(collectionId: string, expectedUpdatedAt: string): Promise<StudioSaveResult>;
}

export interface MergedProduct extends CatalogueProduct {
  isActive: boolean;
  featured: boolean;
  /**
   * Authoritative display order when the management projection supplied it,
   * otherwise null. A visitor bundle never carries it, because the public view
   * model has no display order.
   */
  displayOrder: number | null;
  isUnpriced: boolean;
  isDraft: boolean;
}

export interface MergedCollection extends CatalogueCollection {
  isActive: boolean;
  /** As on products: present only when the management projection supplied it. */
  displayOrder: number | null;
  isDraft: boolean;
}
