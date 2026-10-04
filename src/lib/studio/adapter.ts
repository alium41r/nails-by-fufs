import type {
  CollectionDraft,
  ProductDraft,
  StudioAdapter,
  StudioImage,
  StudioSaveResult,
} from "./types";

/**
 * Local in-memory / session draft adapter.
 *
 * This provides optimistic, immediate local state updates for the studio UI.
 * Saves return `{ success: true, persisted: false }` to indicate that changes
 * are currently held in the browser session and ready for backend wiring.
 *
 * BACKEND WIRING NOTE:
 * When wiring real database updates, replace or wrap this adapter with calls to
 * the existing server actions in `src/app/admin/actions.ts`:
 * - updateProductAction
 * - updateProductPriceAction
 * - updateProductVisibilityAction
 * - updateCollectionAction
 * - deleteProductImageAction
 * - moveProductImageAction
 * - setPrimaryProductImageAction
 * - updateProductImageAltAction
 */
export class LocalStudioAdapter implements StudioAdapter {
  async saveProduct(
    productId: string,
    draft: ProductDraft
  ): Promise<StudioSaveResult> {
    void productId;
    void draft;
    return {
      success: true,
      persisted: false,
      message: "Draft saved locally. Ready for database sync.",
    };
  }

  async saveCollection(
    collectionSlug: string,
    draft: CollectionDraft
  ): Promise<StudioSaveResult> {
    void collectionSlug;
    void draft;
    return {
      success: true,
      persisted: false,
      message: "Collection draft saved locally. Ready for database sync.",
    };
  }

  async uploadImage(
    productId: string,
    file: File
  ): Promise<StudioSaveResult & { image?: StudioImage }> {
    void productId;
    const objectUrl = URL.createObjectURL(file);
    const newImage: StudioImage = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      url: objectUrl,
      alt: file.name.replace(/\.[^/.]+$/, ""),
      isPrimary: false,
      sortOrder: 999,
      ratio: "portrait",
      file,
    };

    return {
      success: true,
      persisted: false,
      image: newImage,
      message: "Image uploaded to local preview.",
    };
  }

  async replaceImage(
    productId: string,
    imageId: string,
    file: File
  ): Promise<StudioSaveResult & { url?: string }> {
    void productId;
    void imageId;
    const objectUrl = URL.createObjectURL(file);
    return {
      success: true,
      persisted: false,
      url: objectUrl,
      message: "Image replaced in local preview.",
    };
  }

  async deleteImage(
    productId: string,
    imageId: string
  ): Promise<StudioSaveResult> {
    void productId;
    void imageId;
    return {
      success: true,
      persisted: false,
      message: "Image removed from local preview.",
    };
  }

  async setPrimaryImage(
    productId: string,
    imageId: string
  ): Promise<StudioSaveResult> {
    void productId;
    void imageId;
    return {
      success: true,
      persisted: false,
      message: "Primary image updated in local preview.",
    };
  }

  async reorderImages(
    productId: string,
    imageIds: string[]
  ): Promise<StudioSaveResult> {
    void productId;
    void imageIds;
    return {
      success: true,
      persisted: false,
      message: "Image order updated in local preview.",
    };
  }

  async updateImageAlt(
    productId: string,
    imageId: string,
    alt: string
  ): Promise<StudioSaveResult> {
    void productId;
    void imageId;
    void alt;
    return {
      success: true,
      persisted: false,
      message: "Alt text updated in local preview.",
    };
  }
}

/** Global singleton adapter instance. Can be swapped with a real backend adapter when ready. */
export const studioAdapter: StudioAdapter = new LocalStudioAdapter();
