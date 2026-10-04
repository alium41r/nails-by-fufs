import type { StudioManagement } from "@/lib/admin/studio-management";

/**
 * The contract between the Studio client and its server actions.
 *
 * These types live apart from `catalogue-actions.ts` on purpose. That module is
 * a `"use server"` file whose implementation reaches the privileged database and
 * Storage clients, so the browser may only import its *action functions* (which
 * Next.js turns into RPC stubs). Keeping the shared shapes here means a client
 * component can describe the payload without pulling a server module into its
 * graph, and keeps the `"use server"` file to nothing but callable actions.
 */

export type StudioResult<T> =
  | { ok: true; kind: "saved"; state: StudioManagement; data: T }
  | {
      ok: false;
      kind: "unauthorized" | "invalid" | "not_found" | "conflict" | "error";
      error: string;
      /** Present on `conflict` so the editor can rebase onto current values. */
      state?: StudioManagement;
    };

export interface StudioProductSaveInput {
  id: string;
  /** The `updatedAt` the editor loaded; the concurrency token. */
  expectedUpdatedAt: string;
  name: string;
  descriptor: string;
  description: string;
  /** Formatted price as typed, e.g. "45.00", or "" to clear it. */
  price: string;
  currency: string;
  shape: string;
  defaultLength: string;
  finish: string;
  tag: string;
  /** Newline-separated list, as the textarea submits it. */
  included: string;
  isActive: boolean;
  featured: boolean;
  /** Empty string means "no explicit order". */
  displayOrder: string;
}

export interface StudioCollectionSaveInput {
  id: string;
  expectedUpdatedAt: string;
  title: string;
  subtitle: string;
  description: string;
  tag: string;
  isActive: boolean;
  featured: boolean;
  displayOrder: string;
}

export type StudioUploadTarget =
  | { ok: true; path: string; token: string; signedUrl: string }
  | { ok: false; error: string };

/** Every action's failure shape, for callers that only care about success. */
export type StudioFailure = Extract<StudioResult<never>, { ok: false }>;
