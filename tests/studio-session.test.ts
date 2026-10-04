import { describe, expect, it } from "vitest";

/**
 * Session-restore behaviour for Studio Mode drafts.
 *
 * This lives in its own file on purpose: `initStudioClient()` is guarded by a
 * module-level `initialized` flag, so the restore path can only be observed once
 * per module instance. The `window` stub therefore has to exist before the store
 * module is first imported, which means no other test in this file may touch the
 * store — the main Studio suite covers the store's live behaviour instead.
 */
const payload = JSON.stringify({
  isActive: true,
  isPreviewMode: false,
  productDrafts: { "prod-1": { name: "Kept Draft" } },
  collectionDrafts: { "core-edit": { coverImageUrl: "blob:dead-on-reload" } },
  savedAt: {},
});

const sessionStorageStub = {
  getItem: (key: string) => (key === "nails_by_fufs_studio_mode_v1" ? payload : null),
  setItem: () => undefined,
  removeItem: () => undefined,
};

// The store's browser checks are `typeof window`, but it reads the ambient
// `sessionStorage` binding, so both have to be stubbed before the module loads.
Object.defineProperty(globalThis, "window", {
  value: { sessionStorage: sessionStorageStub },
  configurable: true,
  writable: true,
});
Object.defineProperty(globalThis, "sessionStorage", {
  value: sessionStorageStub,
  configurable: true,
  writable: true,
});

const { initStudioClient, studioStore } = await import("@/lib/studio/store");

describe("Studio Mode: session restore", () => {
  it("restores drafts and studio activation from session storage", () => {
    initStudioClient();

    const state = studioStore.getSnapshot();
    expect(state.isActive).toBe(true);
    expect(state.isPreviewMode).toBe(false);
    expect(state.productDrafts["prod-1"]?.name).toBe("Kept Draft");
  });

  it("never restores a blob URL that is dead after a reload", () => {
    const draft = studioStore.getSnapshot().collectionDrafts["core-edit"];
    expect(draft).toBeDefined();
    expect(draft.coverImageUrl).toBeNull();
  });
});
