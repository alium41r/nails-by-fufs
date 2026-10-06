"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { StudioManagement } from "@/lib/admin/studio-management";
import { loadStudioState } from "@/lib/admin/catalogue-actions";
import {
  persistCollection,
  persistCoverRemoval,
  persistCoverUpload,
  persistDeleteImage,
  persistImageAlt,
  persistImageUpload,
  persistProduct,
  persistReorder,
  persistSetPrimary,
  toStudioImage,
} from "./adapter";
import { studioStore } from "./store";
import type { CollectionDraft, ProductDraft, StudioImage, StudioSaveResult } from "./types";

/**
 * Authoritative admin state for Studio Mode.
 *
 * ## Where the values come from
 *
 * `CatalogueProduct` deliberately exposes nothing an owner manages: no
 * `is_active`, no `featured` for products, no display order, no minor-unit price
 * and no timestamps. This provider fetches the management projection
 * (`loadStudioState`, admin-authorised) once an admin is actually inside Studio
 * Mode — never during a customer render — and holds it for the editors.
 *
 * That is a correctness requirement, not tidiness: the editor must show the
 * *real* active/featured values, because persisting a UI default would silently
 * publish or unpublish a product.
 *
 * ## What it owns
 *
 * Every write goes through here rather than the editors calling the adapter
 * directly, so exactly one place decides what happens to the management state
 * and the dirty draft after a save:
 *
 * - success → adopt the returned projection and clear the draft, so the
 *   storefront renders database values and no local overlay remains;
 * - conflict → adopt the projection so the owner can see what changed, keep the
 *   draft so their work is not lost, and report that a reload is required;
 * - failure → keep the draft, report the error, change nothing.
 */

export interface StudioManagementContextValue {
  products: StudioManagement["products"];
  collections: StudioManagement["collections"];
  /**
   * The owner-managed content documents, or null before they load.
   *
   * Null (rather than a defaults tree) so a content editor can distinguish
   * "not loaded" from "matches the defaults" — otherwise an early save could
   * overwrite real values with defaults.
   */
  content: StudioManagement["content"] | null;
  /** False outside Studio Mode, where no management data may be fetched. */
  isLoaded: boolean;
  productById: (id: string) => StudioManagement["products"][number] | undefined;
  collectionById: (id: string) => StudioManagement["collections"][number] | undefined;
  collectionBySlug: (slug: string) => StudioManagement["collections"][number] | undefined;
  isLoading: boolean;
  loadError: string | null;
  /** Re-reads the catalogue. Used on entering Studio Mode and after conflicts. */
  refresh: () => Promise<void>;
  /** Discards local edits and returns the editor to current server values. */
  rebaseProduct: (productId: string) => void;
  rebaseCollection: (collectionId: string) => void;
  saveProduct: (productId: string, draft: ProductDraft) => Promise<StudioSaveResult>;
  saveCollection: (collectionId: string, draft: CollectionDraft) => Promise<StudioSaveResult>;
  uploadImage: (
    productId: string,
    file: File,
    replacingImageId?: string,
  ) => Promise<StudioSaveResult & { image?: StudioImage }>;
  deleteImage: (productId: string, imageId: string) => Promise<StudioSaveResult>;
  setPrimaryImage: (productId: string, imageId: string) => Promise<StudioSaveResult>;
  reorderImages: (productId: string, imageIds: string[]) => Promise<StudioSaveResult>;
  updateImageAlt: (productId: string, imageId: string, alt: string) => Promise<StudioSaveResult>;
  uploadCover: (collectionId: string, file: File) => Promise<StudioSaveResult & { url?: string }>;
  removeCover: (collectionId: string) => Promise<StudioSaveResult>;
}

/**
 * The empty projection used before the real one arrives.
 *
 * `content` is `null` rather than a defaults tree: the editors must be able to
 * tell "no content loaded yet" from "the owner's content happens to equal the
 * defaults", and a fallback tree here would let a save write defaults over real
 * values. Components that need content render nothing until it loads.
 */
const EMPTY_MANAGEMENT: StudioManagement = {
  products: [],
  collections: [],
  content: null as unknown as StudioManagement["content"],
};

/**
 * The value a component outside Studio Mode sees.
 *
 * `useStudioProduct` / `useStudioCollection` / `useStudioImages` are called by
 * storefront components that render for *everyone* — `ProductCard` on a visitor
 * page, for instance — and those components are mounted outside the provider.
 * They must therefore degrade to "no management data, no writes" rather than
 * throw, which is exactly what this default does. Nothing in it can mutate.
 */
const ABSENT_MANAGEMENT: StudioManagementContextValue = {
  products: [],
  collections: [],
  content: null,
  isLoaded: false,
  productById: () => undefined,
  collectionById: () => undefined,
  collectionBySlug: () => undefined,
  isLoading: false,
  loadError: null,
  refresh: async () => undefined,
  rebaseProduct: () => undefined,
  rebaseCollection: () => undefined,
  saveProduct: async () => ({
    success: false,
    persisted: false,
    message: "Studio Mode is not active.",
  }),
  saveCollection: async () => ({
    success: false,
    persisted: false,
    message: "Studio Mode is not active.",
  }),
  uploadImage: async () => ({
    success: false,
    persisted: false,
    message: "Studio Mode is not active.",
  }),
  deleteImage: async () => ({
    success: false,
    persisted: false,
    message: "Studio Mode is not active.",
  }),
  setPrimaryImage: async () => ({
    success: false,
    persisted: false,
    message: "Studio Mode is not active.",
  }),
  reorderImages: async () => ({
    success: false,
    persisted: false,
    message: "Studio Mode is not active.",
  }),
  updateImageAlt: async () => ({
    success: false,
    persisted: false,
    message: "Studio Mode is not active.",
  }),
  uploadCover: async () => ({
    success: false,
    persisted: false,
    message: "Studio Mode is not active.",
  }),
  removeCover: async () => ({
    success: false,
    persisted: false,
    message: "Studio Mode is not active.",
  }),
};

const StudioManagementContext = createContext<StudioManagementContextValue>(ABSENT_MANAGEMENT);

export function useStudioManagement(): StudioManagementContextValue {
  return useContext(StudioManagementContext);
}

export function StudioManagementProvider({ children }: { children: React.ReactNode }) {
  const [management, setManagement] = useState<StudioManagement>(EMPTY_MANAGEMENT);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  /** Guards against a stale response overwriting a newer one, and double loads. */
  const requestIdRef = useRef(0);
  const router = useRouter();

  /**
   * Re-reads the Server Component tree that renders the storefront.
   *
   * The management projection already contains the saved values, so the visible
   * storefront updates immediately; this additionally refreshes the server
   * payload — the breadcrumb's collection name, `generateMetadata`, and any
   * server-rendered copy — so a later navigation cannot show the pre-edit state.
   * The server actions also call `revalidatePath`, which is what covers other
   * tabs and visitors.
   */
  const refreshServerTree = useCallback(() => {
    router.refresh();
  }, [router]);

  /** False until the first load settles, so the initial fetch does not need to
   *  announce a loading state it was already mounted in. */
  const hasLoadedOnceRef = useRef(false);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    // `isLoading` already starts true for the first request; setting it again
    // synchronously from the mount effect would be a redundant render.
    if (hasLoadedOnceRef.current) setIsLoading(true);
    try {
      const response = await loadStudioState();
      if (requestId !== requestIdRef.current) return;
      if (!response.ok) {
        setLoadError(response.error);
        return;
      }
      setLoadError(null);
      setManagement(response.state);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setLoadError("The catalogue could not be read. Please reload the page.");
    } finally {
      hasLoadedOnceRef.current = true;
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, []);

  /**
   * Load once, when the admin-only Studio tree first mounts.
   *
   * The management projection is fetched from an external system (the database,
   * through an authorised server action), which is what `refresh` writes into
   * React state. The initial-load rule is disabled deliberately: the alternative
   * — hoisting `isLoading` into the initial state and firing from an event — has
   * no owner event to hang off, because entering Studio Mode is itself a client
   * effect deep inside the tree.
   */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load of external data
    refresh().catch(() => undefined);
  }, [refresh]);

  /**
   * Adopts a fresh projection and clears the draft for the entity that was just
   * persisted.
   *
   * Clearing (rather than leaving the draft in place) is what makes the
   * storefront render real database values after a save, and what stops a
   * re-entered Studio Mode from showing a stale session draft. The projection is
   * applied to the store's image drafts first: a saved gallery is now real
   * Storage URLs, so any local blob preview it replaced is released.
   */
  const adoptProduct = useCallback((productId: string, state: StudioManagement) => {
    setManagement(state);
    refreshServerTree();
    const persisted = state.products.find((product) => product.id === productId);
    if (persisted) {
      // Images are persisted metadata now, so the draft becomes the server copy
      // and `resetProductDraft` can safely stay dirty-free.
      studioStore.setProductImages(
        productId,
        persisted.images.map((image) => toStudioImage(image)),
      );
    }
    studioStore.resetProductDraft(productId, { keepImages: true });
  }, [refreshServerTree]);

  const adoptCollection = useCallback((collectionId: string, state: StudioManagement) => {
    setManagement(state);
    refreshServerTree();
    const current = state.collections.find((collection) => collection.id === collectionId);
    if (current) studioStore.resetCollectionDraft(current.slug);
  }, [refreshServerTree]);

  /* ---------------------------------------------------------------------- */
  /* Products                                                                */
  /* ---------------------------------------------------------------------- */

  const saveProduct = useCallback(
    async (productId: string, draft: ProductDraft): Promise<StudioSaveResult> => {
      const expected = management.products.find((product) => product.id === productId)?.updatedAt;
      if (!expected) {
        return {
          success: false,
          persisted: false,
          message: "This product is not in the loaded catalogue. Reload the page and try again.",
        };
      }

      const outcome = await persistProduct(productId, draft, expected);

      if (outcome.result.success && outcome.state) {
        adoptProduct(productId, outcome.state);
      } else if (outcome.state) {
        // A conflict returns the current server values: show them, keep the draft.
        setManagement(outcome.state);
        refreshServerTree();
      }

      return { ...outcome.result, message: outcome.result.message };
    },
    [management.products, adoptProduct, refreshServerTree],
  );

  const rebaseProduct = useCallback(
    (productId: string) => {
      // Clearing the draft makes the editor render the current management values.
      studioStore.resetProductDraft(productId, { keepImages: true });
    },
    [],
  );

  /* ---------------------------------------------------------------------- */
  /* Collections                                                             */
  /* ---------------------------------------------------------------------- */

  const saveCollection = useCallback(
    async (collectionId: string, draft: CollectionDraft): Promise<StudioSaveResult> => {
      const expected = management.collections.find(
        (collection) => collection.id === collectionId,
      )?.updatedAt;
      if (!expected) {
        return {
          success: false,
          persisted: false,
          message: "This collection is not in the loaded catalogue. Reload the page and try again.",
        };
      }

      const outcome = await persistCollection(collectionId, draft, expected);

      if (outcome.result.success && outcome.state) {
        adoptCollection(collectionId, outcome.state);
      } else if (outcome.state) {
        setManagement(outcome.state);
        refreshServerTree();
      }

      return outcome.result;
    },
    [management.collections, adoptCollection, refreshServerTree],
  );

  const rebaseCollection = useCallback((collectionId: string) => {
    const slug = management.collections.find((collection) => collection.id === collectionId)?.slug;
    if (slug) studioStore.resetCollectionDraft(slug);
  }, [management.collections]);

  /* ---------------------------------------------------------------------- */
  /* Images                                                                  */
  /* ---------------------------------------------------------------------- */

  /**
   * Image writes share one contract: adopt whatever projection the server
   * returned and clear the local gallery draft.
   *
   * The server returns the whole gallery, so the editor never has to guess at
   * sort order or which image became primary — and because the draft is cleared,
   * the gallery renders persisted Storage URLs rather than local previews.
   */
  const settleImages = useCallback(
    async (
      productId: string,
      run: () => Promise<{ result: StudioSaveResult; state?: StudioManagement; image?: StudioImage }>,
    ): Promise<StudioSaveResult & { image?: StudioImage }> => {
      const outcome = await run();
      if (outcome.result.success && outcome.state) adoptProduct(productId, outcome.state);
      else if (outcome.state) {
        setManagement(outcome.state);
        refreshServerTree();
      }
      return { ...outcome.result, ...(outcome.image ? { image: outcome.image } : {}) };
    },
    [adoptProduct, refreshServerTree],
  );

  const uploadImage = useCallback(
    (productId: string, file: File, replacingImageId?: string) =>
      settleImages(productId, () => persistImageUpload(productId, file, replacingImageId)),
    [settleImages],
  );

  const deleteImage = useCallback(
    (productId: string, imageId: string) =>
      settleImages(productId, () => persistDeleteImage(productId, imageId)),
    [settleImages],
  );

  const setPrimaryImage = useCallback(
    (productId: string, imageId: string) =>
      settleImages(productId, () => persistSetPrimary(productId, imageId)),
    [settleImages],
  );

  const reorderImages = useCallback(
    (productId: string, imageIds: string[]) =>
      settleImages(productId, () => persistReorder(productId, imageIds)),
    [settleImages],
  );

  const updateImageAlt = useCallback(
    (productId: string, imageId: string, alt: string) =>
      settleImages(productId, () => persistImageAlt(productId, imageId, alt)),
    [settleImages],
  );

  const uploadCover = useCallback(
    async (collectionId: string, file: File): Promise<StudioSaveResult & { url?: string }> => {
      const expected = management.collections.find(
        (collection) => collection.id === collectionId,
      )?.updatedAt;
      if (!expected) {
        return {
          success: false,
          persisted: false,
          message: "This collection is not in the loaded catalogue. Reload the page and try again.",
        };
      }

      const outcome = await persistCoverUpload(collectionId, file, expected);
      if (outcome.result.success && outcome.state) adoptCollection(collectionId, outcome.state);
      else if (outcome.state) {
        setManagement(outcome.state);
        refreshServerTree();
      }

      return { ...outcome.result, ...(outcome.url ? { url: outcome.url } : {}) };
    },
    [management.collections, adoptCollection, refreshServerTree],
  );

  const removeCover = useCallback(
    async (collectionId: string): Promise<StudioSaveResult> => {
      const expected = management.collections.find(
        (collection) => collection.id === collectionId,
      )?.updatedAt;
      if (!expected) {
        return {
          success: false,
          persisted: false,
          message: "This collection is not in the loaded catalogue. Reload the page and try again.",
        };
      }

      const outcome = await persistCoverRemoval(collectionId, expected);
      if (outcome.result.success && outcome.state) adoptCollection(collectionId, outcome.state);
      else if (outcome.state) {
        setManagement(outcome.state);
        refreshServerTree();
      }

      return outcome.result;
    },
    [management.collections, adoptCollection, refreshServerTree],
  );

  const value = useMemo<StudioManagementContextValue>(
    () => ({
      products: management.products,
      collections: management.collections,
      content: management.content ?? null,
      isLoaded: true,
      productById: (id) => management.products.find((product) => product.id === id),
      collectionById: (id) => management.collections.find((collection) => collection.id === id),
      collectionBySlug: (slug) =>
        management.collections.find((collection) => collection.slug === slug),
      isLoading,
      loadError,
      refresh,
      rebaseProduct,
      rebaseCollection,
      saveProduct,
      saveCollection,
      uploadImage,
      deleteImage,
      setPrimaryImage,
      reorderImages,
      updateImageAlt,
      uploadCover,
      removeCover,
    }),
    [
      management,
      isLoading,
      loadError,
      refresh,
      rebaseProduct,
      rebaseCollection,
      saveProduct,
      saveCollection,
      uploadImage,
      deleteImage,
      setPrimaryImage,
      reorderImages,
      updateImageAlt,
      uploadCover,
      removeCover,
    ],
  );

  return (
    <StudioManagementContext.Provider value={value}>{children}</StudioManagementContext.Provider>
  );
}
