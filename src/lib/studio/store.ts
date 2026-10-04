import { useSyncExternalStore } from "react";
import { isBlobUrl, revokeBlobUrl } from "./derive";
import type {
  CollectionDraft,
  ProductDraft,
  StudioImage,
  StudioPanelTarget,
  StudioState,
} from "./types";

const STORAGE_KEY = "nails_by_fufs_studio_mode_v1";

const initialServerState: StudioState = {
  isActive: false,
  isPreviewMode: false,
  activePanel: null,
  productDrafts: {},
  collectionDrafts: {},
  productImages: {},
  savedAt: {},
};

let currentState: StudioState = initialServerState;
const listeners = new Set<() => void>();
let initialized = false;

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Revokes object URLs for images that are being dropped.
 *
 * `URL.createObjectURL` is used for locally added files; without this the blob
 * URLs (and their file data) stay alive for the whole session. Only `blob:`
 * URLs are touched, so real Storage URLs are never affected.
 */
function revokeDroppedImages(previous: StudioImage[] | undefined, next: StudioImage[] | undefined) {
  if (!previous) return;
  const kept = new Set((next ?? []).map((image) => image.url));
  for (const image of previous) {
    if (isBlobUrl(image.url) && !kept.has(image.url)) {
      revokeBlobUrl(image.url);
    }
  }
}

/**
 * Strips local object URLs out of every persisted draft value.
 *
 * Drafts live in `sessionStorage`, but `blob:` URLs are only valid for the
 * lifetime of the document that created them. Persisting one means the next
 * page load renders a cover/product photo pointing at a dead URL that can never
 * load again, so local previews are deliberately kept session-only.
 *
 * Exported for unit testing: this is the guard that keeps a dead preview out of
 * a future session.
 */
export function stripBlobUrls<T extends Record<string, unknown>>(drafts: T): T {
  const result: Record<string, unknown> = {};
  let changed = false;

  for (const [key, draft] of Object.entries(drafts)) {
    if (!draft || typeof draft !== "object") {
      result[key] = draft;
      continue;
    }

    const cleaned: Record<string, unknown> = { ...(draft as Record<string, unknown>) };
    let draftChanged = false;
    for (const [field, value] of Object.entries(cleaned)) {
      if (isBlobUrl(value)) {
        cleaned[field] = null;
        draftChanged = true;
      } else if (Array.isArray(value) && value.some(isBlobUrl)) {
        cleaned[field] = value.filter((entry) => !isBlobUrl(entry));
        draftChanged = true;
      }
    }

    if (draftChanged) changed = true;
    result[key] = cleaned;
  }

  return (changed ? result : drafts) as T;
}

function persistToSession() {
  if (typeof window === "undefined") return;
  try {
    const toSave = {
      isActive: currentState.isActive,
      isPreviewMode: currentState.isPreviewMode,
      productDrafts: stripBlobUrls(currentState.productDrafts),
      collectionDrafts: stripBlobUrls(currentState.collectionDrafts),
      savedAt: currentState.savedAt,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // sessionStorage quota or security restriction
  }
}

function loadFromSession(): Partial<StudioState> | null {
  if (typeof window === "undefined") return null;
  try {
    const data = sessionStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function initStudioClient() {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;

  const saved = loadFromSession();
  if (saved) {
    currentState = {
      ...currentState,
      isActive: Boolean(saved.isActive),
      isPreviewMode: Boolean(saved.isPreviewMode),
      productDrafts: stripBlobUrls(saved.productDrafts || {}),
      collectionDrafts: stripBlobUrls(saved.collectionDrafts || {}),
      savedAt: saved.savedAt || {},
    };
    notify();
  }
}

export const studioStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getSnapshot(): StudioState {
    return currentState;
  },

  getServerSnapshot(): StudioState {
    return initialServerState;
  },

  setActive(isActive: boolean) {
    currentState = {
      ...currentState,
      isActive,
      isPreviewMode: false,
      activePanel: isActive ? currentState.activePanel : null,
    };
    persistToSession();
    notify();
  },

  setPreviewMode(isPreviewMode: boolean) {
    currentState = {
      ...currentState,
      isPreviewMode,
      activePanel: isPreviewMode ? null : currentState.activePanel,
    };
    persistToSession();
    notify();
  },

  openPanel(panel: StudioPanelTarget) {
    currentState = {
      ...currentState,
      activePanel: panel,
      isPreviewMode: false,
    };
    notify();
  },

  closePanel() {
    currentState = {
      ...currentState,
      activePanel: null,
    };
    notify();
  },

  patchProductDraft(id: string, patch: Partial<ProductDraft>) {
    const existing = currentState.productDrafts[id] || {};
    currentState = {
      ...currentState,
      productDrafts: {
        ...currentState.productDrafts,
        [id]: {
          ...existing,
          ...patch,
        },
      },
    };
    persistToSession();
    notify();
  },

  resetProductDraft(id: string) {
    revokeDroppedImages(currentState.productImages[id], []);
    const newDrafts = { ...currentState.productDrafts };
    delete newDrafts[id];
    const newImages = { ...currentState.productImages };
    delete newImages[id];
    currentState = {
      ...currentState,
      productDrafts: newDrafts,
      productImages: newImages,
    };
    persistToSession();
    notify();
  },

  patchCollectionDraft(slug: string, patch: Partial<CollectionDraft>) {
    const existing = currentState.collectionDrafts[slug] || {};
    currentState = {
      ...currentState,
      collectionDrafts: {
        ...currentState.collectionDrafts,
        [slug]: {
          ...existing,
          ...patch,
        },
      },
    };
    persistToSession();
    notify();
  },

  resetCollectionDraft(slug: string) {
    const newDrafts = { ...currentState.collectionDrafts };
    delete newDrafts[slug];
    currentState = {
      ...currentState,
      collectionDrafts: newDrafts,
    };
    persistToSession();
    notify();
  },

  setProductImages(productId: string, images: StudioImage[]) {
    revokeDroppedImages(currentState.productImages[productId], images);
    currentState = {
      ...currentState,
      productImages: {
        ...currentState.productImages,
        [productId]: images,
      },
    };
    notify();
  },

  /**
   * Applies a functional update to one product's image draft.
   *
   * Image edits (reorder, set primary, delete, replace) read the *current*
   * stored list rather than a value captured in a render closure, so two quick
   * clicks in the same tick cannot overwrite each other and lose an edit.
   * Mutation is refused when the update produces an identical list.
   */
  updateProductImages(
    productId: string,
    updater: (images: StudioImage[]) => StudioImage[]
  ) {
    const previous = currentState.productImages[productId];
    const next = updater(previous ?? []);
    if (previous && next === previous) return;

    revokeDroppedImages(previous, next);
    currentState = {
      ...currentState,
      productImages: {
        ...currentState.productImages,
        [productId]: next,
      },
    };
    notify();
  },

  markSaved(entityKey: string) {
    currentState = {
      ...currentState,
      savedAt: {
        ...currentState.savedAt,
        [entityKey]: Date.now(),
      },
    };
    persistToSession();
    notify();
  },

  resetAllDrafts() {
    for (const images of Object.values(currentState.productImages)) {
      revokeDroppedImages(images, []);
    }
    currentState = {
      ...currentState,
      productDrafts: {},
      collectionDrafts: {},
      productImages: {},
      savedAt: {},
      activePanel: null,
    };
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    notify();
  },
};

/** Counts all pending unsaved entity drafts. */
export function countPendingDrafts(state: StudioState): number {
  const productCount = Object.keys(state.productDrafts).length;
  const collectionCount = Object.keys(state.collectionDrafts).length;
  const imageCount = Object.keys(state.productImages).length;
  return productCount + collectionCount + imageCount;
}

/** Hook to subscribe to studio store state safely with useSyncExternalStore. */
export function useStudioStore(): StudioState {
  return useSyncExternalStore(
    studioStore.subscribe,
    studioStore.getSnapshot,
    studioStore.getServerSnapshot
  );
}
