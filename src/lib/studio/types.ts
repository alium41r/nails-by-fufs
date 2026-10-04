import type { CatalogueProduct, CatalogueCollection, PlaceholderRatio } from "@/lib/catalogue";

export interface ProductDraft {
  name?: string;
  descriptor?: string;
  description?: string;
  priceMinor?: number | null;
  currency?: string | null;
  shape?: string;
  length?: "Short" | "Medium" | "Long";
  finish?: string;
  tag?: string;
  included?: string[];
  isActive?: boolean;
  featured?: boolean;
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
  | { type: "images"; productId: string; focusField?: string };

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
  persisted: boolean;
  message?: string;
}

export interface StudioAdapter {
  saveProduct(productId: string, draft: ProductDraft): Promise<StudioSaveResult>;
  saveCollection(collectionSlug: string, draft: CollectionDraft): Promise<StudioSaveResult>;
  uploadImage(productId: string, file: File): Promise<StudioSaveResult & { image?: StudioImage }>;
  replaceImage(productId: string, imageId: string, file: File): Promise<StudioSaveResult & { url?: string }>;
  deleteImage(productId: string, imageId: string): Promise<StudioSaveResult>;
  setPrimaryImage(productId: string, imageId: string): Promise<StudioSaveResult>;
  reorderImages(productId: string, imageIds: string[]): Promise<StudioSaveResult>;
  updateImageAlt(productId: string, imageId: string, alt: string): Promise<StudioSaveResult>;
}

export interface MergedProduct extends CatalogueProduct {
  isActive: boolean;
  featured: boolean;
  isUnpriced: boolean;
  isDraft: boolean;
}

export interface MergedCollection extends CatalogueCollection {
  isActive: boolean;
  isDraft: boolean;
}
