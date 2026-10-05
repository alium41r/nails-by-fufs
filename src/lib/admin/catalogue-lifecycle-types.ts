/**
 * Result and input shapes for the catalogue lifecycle actions.
 *
 * Kept apart from `src/app/admin/catalogue-lifecycle-actions.ts` because that
 * module is a `"use server"` file, and such a file may only export async
 * functions — a type export is erased at build time but still trips the
 * compiler's export check in some configurations. Declaring the shapes here means
 * a client component can describe a payload without importing a server module.
 */

export type CatalogueResult =
  | { ok: true; id?: string; slug?: string; message: string }
  | { ok: false; error: string };

export interface CreateProductInput {
  name: string;
  collectionId: string | null;
  slug?: string;
  descriptor?: string;
  shape?: string;
  defaultLength?: string;
  finish?: string;
  description?: string;
}

export type BulkProductAction =
  | "activate"
  | "deactivate"
  | "feature"
  | "unfeature"
  | "archive"
  | "restore"
  | "assign-collection";

export type BulkCollectionAction =
  | "activate"
  | "deactivate"
  | "feature"
  | "unfeature"
  | "archive"
  | "restore";
