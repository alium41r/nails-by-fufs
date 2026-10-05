/**
 * E2E driver: invokes the REAL Studio server actions in-process, against the
 * real Supabase project, with a REAL admin session supplied through the same
 * cookie path the app uses.
 *
 * Only the request-scoped plumbing is substituted:
 *  - next/headers `cookies()`  -> a jar carrying the minted session cookie
 *  - next/cache `revalidatePath` / `updateTag` / `unstable_cache` -> recorded,
 *    no-op, or a pass-through, so the suite can assert that a write invalidated
 *    the cached catalogue.
 * Everything else — getAdminUser(), the allowlist, validation, Prisma, Storage,
 * path scoping and the optimistic concurrency predicate — is the production code.
 */
import { setCookieJar } from "./request-headers";
import {
  clearRevalidated,
  revalidatedPaths,
  revalidatedTags,
  revalidatedUpdates,
} from "./next-cache";

import {
  saveContentDocument,
  saveContentDocuments,
  resetContentDocumentAction,
  saveStoreSettings,
  prepareSiteImageUpload,
  finalizeSiteImageUpload,
  clearSiteImage,
} from "@/app/admin/content-actions";
import {
  createProduct,
  duplicateProduct,
  archiveProduct,
  restoreProduct,
  deleteProduct,
  createCollection,
  archiveCollection,
  restoreCollection,
  reassignCollectionProducts,
  deleteCollection,
  reorderProducts,
  reorderCollections,
  bulkUpdateProducts,
  bulkUpdateCollections,
} from "@/app/admin/catalogue-lifecycle-actions";
import {
  loadStudioState,
  saveStudioProduct,
  saveStudioCollection,
  prepareStudioImageUpload,
  finalizeStudioImageUpload,
  reorderStudioImages,
  setStudioPrimaryImage,
  updateStudioImageAlt,
  deleteStudioImage,
  prepareStudioCoverUpload,
  finalizeStudioCoverUpload,
  removeStudioCover,
} from "@/lib/admin/catalogue-actions";

export const actions = {
  loadStudioState,
  saveStudioProduct,
  saveStudioCollection,
  prepareStudioImageUpload,
  finalizeStudioImageUpload,
  reorderStudioImages,
  setStudioPrimaryImage,
  updateStudioImageAlt,
  deleteStudioImage,
  prepareStudioCoverUpload,
  finalizeStudioCoverUpload,
  removeStudioCover,

  // Owner-managed storefront content and store settings.
  saveContentDocument,
  saveContentDocuments,
  resetContentDocumentAction,
  saveStoreSettings,
  prepareSiteImageUpload,
  finalizeSiteImageUpload,
  clearSiteImage,

  // Catalogue lifecycle: create, duplicate, archive, restore, delete, reorder,
  // and the bulk operations.
  createProduct,
  duplicateProduct,
  archiveProduct,
  restoreProduct,
  deleteProduct,
  createCollection,
  archiveCollection,
  restoreCollection,
  reassignCollectionProducts,
  deleteCollection,
  reorderProducts,
  reorderCollections,
  bulkUpdateProducts,
  bulkUpdateCollections,
};

export {
  setCookieJar,
  clearRevalidated,
  revalidatedPaths,
  revalidatedTags,
  revalidatedUpdates,
};
