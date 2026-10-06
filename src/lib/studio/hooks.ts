"use client";

import { useMemo } from "react";
import type {
  CatalogueCollection,
  CatalogueProduct,
} from "@/lib/catalogue";
import {
  applyCollectionDraft,
  applyProductDraft,
  baseToStudioImages,
  managementToCatalogueView,
  managementToCollectionView,
  normalizeManagedImages,
  PRICE_PLACEHOLDER,
  studioToCatalogueImages,
} from "./derive";
import { useStudioManagement } from "./management";
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
    openContentEditor: (key: string, focusField?: string) =>
      studioStore.openPanel({ type: "content", key, focusField }),
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
 * The base a draft is merged onto.
 *
 * When the admin-only management projection is loaded it wins, because it is the
 * only source that carries `is_active`, `featured`, display order and the stored
 * price in minor units. Outside Studio Mode it is absent, and the visitor
 * projection is used untouched.
 */
export function useStudioProduct(product: CatalogueProduct): MergedProduct {
  const state = useStudioStore();
  const management = useStudioManagement();

  const managed = management.productById(product.id);

  return useMemo(() => {
    const base = managed ? managementToCatalogueView(managed) : product;

    if (!state.isActive) {
      // Not in Studio Mode: hand back the visitor projection exactly as-is.
      return {
        ...base,
        isActive: true,
        featured: false,
        isUnpriced: base.price === PRICE_PLACEHOLDER,
        isDraft: false,
        displayOrder: null,
      } as MergedProduct;
    }

    const draft = state.productDrafts[product.id];
    const images = state.productImages[product.id];
    return applyProductDraft(base, draft, images);
  }, [product, managed, state.isActive, state.productDrafts, state.productImages]);
}

/**
 * Returns merged collection reflecting any active studio draft.
 *
 * `collection` is the visitor view model, which carries `featured` but no
 * `is_active`; the management projection supplies the authoritative pair.
 */
export function useStudioCollection(collection: CatalogueCollection): MergedCollection {
  const state = useStudioStore();
  const management = useStudioManagement();

  const managed = management.collectionBySlug(collection.slug);

  return useMemo(() => {
    const base = managed ? managementToCollectionView(managed) : collection;
    if (!state.isActive) {
      return { ...base, isActive: true, isDraft: false } as MergedCollection;
    }

    const draft = state.collectionDrafts[collection.slug];
    return applyCollectionDraft(base, draft);
  }, [collection, managed, state.isActive, state.collectionDrafts]);
}

/**
 * Returns product images, taking into account local drafts.
 *
 * The management gallery is the base whenever it is available, so the editor
 * shows persisted metadata (real sort order, primary flag and alt text). Only a
 * genuinely unsaved local draft — a blob preview just picked from disk —
 * overrides it.
 */
export function useStudioImages(product: CatalogueProduct) {
  const state = useStudioStore();
  const management = useStudioManagement();

  const managed = management.productById(product.id);

  return useMemo(() => {
    const managedImages = managed ? normalizeManagedImages(managed.images) : null;
    const customImages = state.productImages[product.id];

    if (state.isActive && customImages && managedImages) {
      // Drafts win only while they hold something the server does not have yet.
      const hasLocalOnly = customImages.some(
        (image) => typeof image.url === "string" && image.url.startsWith("blob:"),
      );
      if (hasLocalOnly) {
        return {
          studioImages: customImages,
          catalogueImages: studioToCatalogueImages(customImages, managed?.name ?? product.name),
          isDraft: true,
        };
      }
      return {
        studioImages: managedImages,
        catalogueImages: studioToCatalogueImages(managedImages, managed?.name ?? product.name),
        isDraft: false,
      };
    }

    if (state.isActive && customImages) {
      return {
        studioImages: customImages,
        catalogueImages: studioToCatalogueImages(customImages, product.name),
        isDraft: true,
      };
    }

    if (managedImages) {
      return {
        studioImages: managedImages,
        catalogueImages: studioToCatalogueImages(managedImages, managed?.name ?? product.name),
        isDraft: false,
      };
    }

    const baseImages = baseToStudioImages(product);
    return {
      studioImages: baseImages,
      catalogueImages: product.images,
      isDraft: false,
    };
  }, [product, managed, state.isActive, state.productImages]);
}
