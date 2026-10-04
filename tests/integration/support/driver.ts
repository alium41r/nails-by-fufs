/**
 * E2E driver: invokes the REAL Studio server actions in-process, against the
 * real Supabase project, with a REAL admin session supplied through the same
 * cookie path the app uses.
 *
 * Only the request-scoped plumbing is substituted:
 *  - next/headers `cookies()`  -> a jar carrying the minted session cookie
 *  - next/cache `revalidatePath` -> recorded, no-op
 * Everything else — getAdminUser(), the allowlist, validation, Prisma, Storage,
 * path scoping and the optimistic concurrency predicate — is the production code.
 */
import { setCookieJar } from "./next-headers";
import { clearRevalidated, revalidatedPaths } from "./next-cache";

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
};

export { setCookieJar, clearRevalidated, revalidatedPaths };
