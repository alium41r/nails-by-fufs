import { useMemo } from "react";
import type {
  CatalogueCollection,
  CatalogueProduct,
} from "@/lib/catalogue";
import {
  applyCollectionDraft,
  applyProductDraft,
  baseToStudioImages,
  studioToCatalogueImages,
} from "./derive";
import { countPendingDrafts, studioStore, useStudioStore } from "./store";
import type {
  MergedCollection,
  MergedProduct,
  StudioPanelTarget,
} from "./types";

export function useStudio() {
  const state = useStudioStore();

  const isEditing = state.isActive && !state.isPreviewMode;
  const pendingCount = countPendingDrafts(state);

  return {
    state,
    isActive: state.isActive,
    isPreviewMode: state.isPreviewMode,
    isEditing,
    activePanel: state.activePanel,
    pendingCount,
    setActive: (active: boolean) => studioStore.setActive(active),
    setPreviewMode: (preview: boolean) => studioStore.setPreviewMode(preview),
    openPanel: (target: StudioPanelTarget) => studioStore.openPanel(target),
    closePanel: () => studioStore.closePanel(),
    openProductEditor: (id: string, focusField?: string) =>
      studioStore.openPanel({ type: "product", id, focusField }),
    openCollectionEditor: (slug: string, focusField?: string) =>
      studioStore.openPanel({ type: "collection", slug, focusField }),
    openImageManager: (productId: string, focusField?: string) =>
      studioStore.openPanel({ type: "images", productId, focusField }),
    patchProduct: (id: string, patch: Parameters<typeof studioStore.patchProductDraft>[1]) =>
      studioStore.patchProductDraft(id, patch),
    resetProduct: (id: string) => studioStore.resetProductDraft(id),
    patchCollection: (slug: string, patch: Parameters<typeof studioStore.patchCollectionDraft>[1]) =>
      studioStore.patchCollectionDraft(slug, patch),
    resetCollection: (slug: string) => studioStore.resetCollectionDraft(slug),
    resetAllDrafts: () => studioStore.resetAllDrafts(),
    markSaved: (key: string) => studioStore.markSaved(key),
  };
}

/**
 * Returns merged product reflecting any active studio draft when studio mode is active.
 * For normal visitors or outside studio mode, returns the base product untouched.
 */
export function useStudioProduct(product: CatalogueProduct): MergedProduct {
  const state = useStudioStore();

  return useMemo(() => {
    if (!state.isActive) {
      return {
        ...product,
        isActive: true,
        featured: false,
        isUnpriced: product.price === "$XX",
        isDraft: false,
      };
    }

    const draft = state.productDrafts[product.id];
    const images = state.productImages[product.id];
    return applyProductDraft(product, draft, images);
  }, [product, state.isActive, state.productDrafts, state.productImages]);
}

/**
 * Returns merged collection reflecting any active studio draft when studio mode is active.
 */
export function useStudioCollection(collection: CatalogueCollection): MergedCollection {
  const state = useStudioStore();

  return useMemo(() => {
    if (!state.isActive) {
      return {
        ...collection,
        isActive: true,
        isDraft: false,
      };
    }

    const draft = state.collectionDrafts[collection.slug];
    return applyCollectionDraft(collection, draft);
  }, [collection, state.isActive, state.collectionDrafts]);
}

/**
 * Returns product images, taking into account local drafts.
 */
export function useStudioImages(product: CatalogueProduct) {
  const state = useStudioStore();

  return useMemo(() => {
    const customImages = state.productImages[product.id];
    if (!state.isActive || !customImages) {
      const baseImages = baseToStudioImages(product);
      return {
        studioImages: baseImages,
        catalogueImages: product.images,
        isDraft: false,
      };
    }

    return {
      studioImages: customImages,
      catalogueImages: studioToCatalogueImages(customImages, product.name),
      isDraft: true,
    };
  }, [product, state.isActive, state.productImages]);
}
