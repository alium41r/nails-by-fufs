"use client";

import type { StudioFailure, StudioResult } from "@/lib/admin/studio-action-types";
import type { StudioManagement } from "@/lib/admin/studio-management";
import type {
  CollectionDraft,
  ProductDraft,
  StudioAdapter,
  StudioImage,
  StudioSaveResult,
} from "./types";

/**
 * The Studio client's write path: the existing admin-authorised server actions.
 *
 * ## What this replaces
 *
 * The previous adapter was local-only and returned `persisted: false`; nothing
 * was ever written. Every method here performs a real server round trip. No
 * validation is re-implemented on this side — the server owns MIME/size checks,
 * path scoping, slug and price rules, and the concurrency predicate. The
 * client's only jobs are to relay the version token and to upload bytes straight
 * to Storage with the signed URL it is handed.
 *
 * ## Why the bytes never pass through the Next.js server
 *
 * `prepare*Upload` mints a short-lived signed URL for a path the *server*
 * generated. The browser then PUTs the file to Storage directly, so no
 * credential reaches the client and the image body never transits the app
 * server. The metadata row is only written by a `finalize*` call, which first
 * re-reads the object's real content type and size from Storage.
 *
 * ## Two entry points, one implementation
 *
 * `StudioAdapter` (the original seam) returns a plain `StudioSaveResult` and is
 * what the editors call. {@link StudioPersistAdapter} exposes the same work as
 * {@link StudioPersistOutcome}, which also carries the fresh management
 * projection so the provider can adopt it synchronously. No request is ever
 * issued twice: the seam methods delegate to the outcome methods.
 */

/** A save outcome plus the management state the provider should adopt. */
export interface StudioPersistOutcome {
  result: StudioSaveResult;
  /** Present whenever the server returned a fresh projection. */
  state?: StudioManagement;
  /** The stored image, for the image actions that create one. */
  image?: StudioImage;
  /** The stored cover URL, for the cover upload. */
  url?: string;
}

/** Converts an action failure into the editor's result shape. */
function toSaveResult(failure: StudioFailure): StudioSaveResult {
  return {
    success: false,
    persisted: false,
    message: failure.error,
    conflict: failure.kind === "conflict",
    unauthorized: failure.kind === "unauthorized",
  };
}

/** Normalises an action outcome into a persist outcome. */
function describe<T>(outcome: StudioResult<T>): StudioPersistOutcome {
  if (!outcome.ok) return { result: toSaveResult(outcome), state: outcome.state };
  return { result: { success: true, persisted: true }, state: outcome.state };
}

function nonOk(error: string): StudioSaveResult {
  return { success: false, persisted: false, message: error };
}

/**
 * Runs a server action, turning a transport-level failure (a dropped
 * connection, an expired session) into a normal result instead of an unhandled
 * rejection, so the editor keeps the draft and shows the message.
 */
async function callAction<T>(
  run: () => Promise<StudioResult<T>>,
  fallbackMessage: string,
): Promise<StudioPersistOutcome> {
  try {
    return describe(await run());
  } catch {
    return { result: nonOk(fallbackMessage) };
  }
}

/** Uploads a file to a signed Storage URL. Throws a readable error on failure. */
async function putToStorage(signedUrl: string, file: File, failureMessage: string): Promise<void> {
  const response = await fetch(signedUrl, {
    method: "PUT",
    headers: { "content-type": file.type, "x-upsert": "false" },
    body: file,
  });
  if (!response.ok) throw new Error(failureMessage);
}

/**
 * Builds the server payload from a product draft.
 *
 * No currency travels with it. The server derives the stored code from
 * `@/lib/currency`, which is what makes it impossible for a client — or a stale
 * cached bundle — to price a product in anything but rupees.
 */
function productPayload(productId: string, draft: ProductDraft, expectedUpdatedAt: string) {
  const priceMinor = draft.priceMinor ?? null;
  const hasPrice = priceMinor !== null;

  return {
    id: productId,
    expectedUpdatedAt,
    name: draft.name ?? "",
    descriptor: draft.descriptor ?? "",
    description: draft.description ?? "",
    // The editor drafts minor units; the server takes a formatted amount and
    // re-derives them, exactly as the admin price form does.
    price: hasPrice ? (priceMinor / 100).toFixed(2) : "",
    shape: draft.shape ?? "",
    defaultLength: draft.length ?? "Medium",
    finish: draft.finish ?? "",
    tag: draft.tag ?? "",
    included: (draft.included ?? []).join("\n"),
    isActive: draft.isActive ?? true,
    featured: draft.featured ?? false,
    displayOrder:
      draft.displayOrder === null || draft.displayOrder === undefined
        ? ""
        : String(draft.displayOrder),
  };
}

/** Builds the server payload from a collection draft. */
function collectionPayload(
  collectionId: string,
  draft: CollectionDraft,
  expectedUpdatedAt: string,
) {
  return {
    id: collectionId,
    expectedUpdatedAt,
    title: draft.title ?? "",
    subtitle: draft.subtitle ?? "",
    description: draft.description ?? "",
    tag: draft.tag ?? "",
    isActive: draft.isActive ?? true,
    featured: draft.featured ?? false,
    displayOrder:
      draft.displayOrder === null || draft.displayOrder === undefined
        ? ""
        : String(draft.displayOrder),
  };
}

/**
 * Maps the management image shape onto the editor's draft image shape.
 *
 * Exported so the management provider can relabel a gallery straight from a save
 * result without re-deriving the whole projection.
 */
export function toStudioImage(image: {
  id: string;
  url: string | null;
  alt: string;
  isPrimary: boolean;
  sortOrder: number;
  ratio: StudioImage["ratio"];
}): StudioImage {
  return {
    id: image.id,
    url: image.url,
    alt: image.alt,
    isPrimary: image.isPrimary,
    sortOrder: image.sortOrder,
    ratio: image.ratio,
  };
}

/* -------------------------------------------------------------------------- */
/* Outcome-level operations (used by the management provider)                  */
/* -------------------------------------------------------------------------- */

export async function persistProduct(
  productId: string,
  draft: ProductDraft,
  expectedUpdatedAt: string,
): Promise<StudioPersistOutcome> {
  return callAction(
    () =>
      import("@/lib/admin/catalogue-actions").then((m) =>
        m.saveStudioProduct(productPayload(productId, draft, expectedUpdatedAt)),
      ),
    "The product could not be saved. Check your connection and try again.",
  );
}

export async function persistCollection(
  collectionId: string,
  draft: CollectionDraft,
  expectedUpdatedAt: string,
): Promise<StudioPersistOutcome> {
  return callAction(
    () =>
      import("@/lib/admin/catalogue-actions").then((m) =>
        m.saveStudioCollection(collectionPayload(collectionId, draft, expectedUpdatedAt)),
      ),
    "The collection could not be saved. Check your connection and try again.",
  );
}

/**
 * Uploads a photograph and records it.
 *
 * The metadata row is created only by `finalizeStudioImageUpload`, which first
 * confirms the object exists in Storage and re-reads its real type and size.
 * When `replacingImageId` is given, the server places the new row where the old
 * one sat and removes the superseded row and object.
 */
export async function persistImageUpload(
  productId: string,
  file: File,
  replacingImageId?: string,
): Promise<StudioPersistOutcome> {
  const { prepareStudioImageUpload, finalizeStudioImageUpload } = await import(
    "@/lib/admin/catalogue-actions"
  );

  const target = await prepareStudioImageUpload({
    productId,
    contentType: file.type,
    sizeBytes: file.size,
    ...(replacingImageId ? { replacingImageId } : {}),
  }).catch(() => null);

  if (!target) {
    return {
      result: nonOk("The upload could not be prepared. Check your connection and try again."),
    };
  }
  if (!target.ok) return { result: nonOk(target.error) };

  try {
    await putToStorage(target.signedUrl, file, "The image upload failed. Please try again.");
  } catch (error) {
    return { result: nonOk(error instanceof Error ? error.message : "The image upload failed.") };
  }

  const outcome = await callAction(
    () =>
      finalizeStudioImageUpload({
        productId,
        path: target.path,
        altText: file.name.replace(/\.[^/.]+$/, ""),
        ...(replacingImageId ? { replacingImageId } : {}),
      }),
    "The photograph uploaded but could not be recorded. Please refresh and try again.",
  );

  if (!outcome.result.success) return outcome;

  // The persisted row is the one whose Storage URL ends with the path we minted.
  const persisted = outcome.state?.products
    .find((product) => product.id === productId)
    ?.images.find((image) => image.url?.endsWith(target.path));

  return { ...outcome, ...(persisted ? { image: toStudioImage(persisted) } : {}) };
}

export async function persistDeleteImage(
  productId: string,
  imageId: string,
): Promise<StudioPersistOutcome> {
  return callAction(
    () =>
      import("@/lib/admin/catalogue-actions").then((m) =>
        m.deleteStudioImage({ productId, imageId }),
      ),
    "The photograph could not be removed. Check your connection and try again.",
  );
}

export async function persistSetPrimary(
  productId: string,
  imageId: string,
): Promise<StudioPersistOutcome> {
  return callAction(
    () =>
      import("@/lib/admin/catalogue-actions").then((m) =>
        m.setStudioPrimaryImage({ productId, imageId }),
      ),
    "The cover could not be updated. Check your connection and try again.",
  );
}

export async function persistReorder(
  productId: string,
  imageIds: string[],
): Promise<StudioPersistOutcome> {
  return callAction(
    () =>
      import("@/lib/admin/catalogue-actions").then((m) =>
        m.reorderStudioImages({ productId, imageIds }),
      ),
    "The new order could not be saved. Check your connection and try again.",
  );
}

export async function persistImageAlt(
  productId: string,
  imageId: string,
  alt: string,
): Promise<StudioPersistOutcome> {
  return callAction(
    () =>
      import("@/lib/admin/catalogue-actions").then((m) =>
        m.updateStudioImageAlt({ productId, imageId, altText: alt }),
      ),
    "The description could not be saved. Check your connection and try again.",
  );
}

/** Uploads a collection cover and points the collection at it. */
export async function persistCoverUpload(
  collectionId: string,
  file: File,
  expectedUpdatedAt: string,
): Promise<StudioPersistOutcome> {
  const { prepareStudioCoverUpload, finalizeStudioCoverUpload } = await import(
    "@/lib/admin/catalogue-actions"
  );

  const target = await prepareStudioCoverUpload({
    collectionId,
    contentType: file.type,
    sizeBytes: file.size,
  }).catch(() => null);

  if (!target) {
    return {
      result: nonOk("The upload could not be prepared. Check your connection and try again."),
    };
  }
  if (!target.ok) return { result: nonOk(target.error) };

  try {
    await putToStorage(target.signedUrl, file, "The cover upload failed. Please try again.");
  } catch (error) {
    return { result: nonOk(error instanceof Error ? error.message : "The cover upload failed.") };
  }

  const outcome = await callAction(
    () => finalizeStudioCoverUpload({ collectionId, path: target.path, expectedUpdatedAt }),
    "The cover uploaded but could not be recorded. Please refresh and try again.",
  );

  if (!outcome.result.success) return outcome;

  const persisted = outcome.state?.collections.find((collection) => collection.id === collectionId);
  return { ...outcome, ...(persisted?.coverImageUrl ? { url: persisted.coverImageUrl } : {}) };
}

export async function persistCoverRemoval(
  collectionId: string,
  expectedUpdatedAt: string,
): Promise<StudioPersistOutcome> {
  return callAction(
    () =>
      import("@/lib/admin/catalogue-actions").then((m) =>
        m.removeStudioCover({ collectionId, expectedUpdatedAt }),
      ),
    "The cover could not be removed. Check your connection and try again.",
  );
}

/* -------------------------------------------------------------------------- */
/* The StudioAdapter seam                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Thin facade over the operations above, kept so the editors depend on the
 * documented seam rather than on individual functions. Each method forwards the
 * outcome's `result`; the provider calls the `persist*` functions directly when
 * it also needs the projection.
 */
export class ServerStudioAdapter implements StudioAdapter {
  async saveProduct(
    productId: string,
    draft: ProductDraft,
    expectedUpdatedAt: string,
  ): Promise<StudioSaveResult> {
    return (await persistProduct(productId, draft, expectedUpdatedAt)).result;
  }

  async saveCollection(
    collectionId: string,
    draft: CollectionDraft,
    expectedUpdatedAt: string,
  ): Promise<StudioSaveResult> {
    return (await persistCollection(collectionId, draft, expectedUpdatedAt)).result;
  }

  async uploadImage(
    productId: string,
    file: File,
    replacingImageId?: string,
  ): Promise<StudioSaveResult & { image?: StudioImage }> {
    const outcome = await persistImageUpload(productId, file, replacingImageId);
    return { ...outcome.result, ...(outcome.image ? { image: outcome.image } : {}) };
  }

  async replaceImage(
    productId: string,
    imageId: string,
    file: File,
  ): Promise<StudioSaveResult & { url?: string }> {
    return this.uploadImage(productId, file, imageId);
  }

  async deleteImage(productId: string, imageId: string): Promise<StudioSaveResult> {
    return (await persistDeleteImage(productId, imageId)).result;
  }

  async setPrimaryImage(productId: string, imageId: string): Promise<StudioSaveResult> {
    return (await persistSetPrimary(productId, imageId)).result;
  }

  async reorderImages(productId: string, imageIds: string[]): Promise<StudioSaveResult> {
    return (await persistReorder(productId, imageIds)).result;
  }

  async updateImageAlt(productId: string, imageId: string, alt: string): Promise<StudioSaveResult> {
    return (await persistImageAlt(productId, imageId, alt)).result;
  }

  async uploadCover(
    collectionId: string,
    file: File,
    expectedUpdatedAt: string,
  ): Promise<StudioSaveResult & { url?: string }> {
    const outcome = await persistCoverUpload(collectionId, file, expectedUpdatedAt);
    return { ...outcome.result, ...(outcome.url ? { url: outcome.url } : {}) };
  }

  async removeCover(collectionId: string, expectedUpdatedAt: string): Promise<StudioSaveResult> {
    return (await persistCoverRemoval(collectionId, expectedUpdatedAt)).result;
  }
}

export const studioAdapter: StudioAdapter = new ServerStudioAdapter();
