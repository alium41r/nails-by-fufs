"use client";

import React, { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useStudio } from "@/lib/studio/hooks";
import { hasOpenStudioOverlay, trackStudioOverlay } from "@/lib/studio/overlay";
import { useStudioCatalogue } from "./StudioProvider";
import { X } from "lucide-react";

/**
 * The three editors are the heaviest part of Studio Mode and only one of them is
 * ever open, so each is loaded on demand instead of with the storefront.
 */
const EditorLoading = () => (
  <div className="p-8 text-center text-xs text-muted-foreground">Loading editor…</div>
);

const ProductEditor = dynamic(() => import("./ProductEditor").then((m) => m.ProductEditor), {
  ssr: false,
  loading: EditorLoading,
});
const CollectionEditor = dynamic(
  () => import("./CollectionEditor").then((m) => m.CollectionEditor),
  { ssr: false, loading: EditorLoading }
);
const ImageManager = dynamic(() => import("./ImageManager").then((m) => m.ImageManager), {
  ssr: false,
  loading: EditorLoading,
});

export function StudioPanel() {
  const { isActive, isPreviewMode, activePanel, closePanel } = useStudio();
  const { products, collections, currentProduct, currentCollection } = useStudioCatalogue();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const isOpen = Boolean(isActive && !isPreviewMode && activePanel);

  useEffect(() => {
    if (!isOpen) return;
    const releaseOverlay = trackStudioOverlay();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // The toolbar's confirmation dialog sits on top and owns Escape while open.
      if (hasOpenStudioOverlay()) return;
      e.preventDefault();
      closePanel();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      releaseOverlay();
    };
  }, [isOpen, closePanel]);

  // Move focus into the drawer on open and hand it back to the trigger on close,
  // so keyboard users are not stranded behind a `aria-modal` region.
  useEffect(() => {
    if (!isOpen) return;

    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    return () => {
      const target = restoreFocusRef.current;
      restoreFocusRef.current = null;
      if (target && document.contains(target)) {
        target.focus();
      }
    };
  }, [isOpen]);

  /**
   * Freeze page scrolling while the drawer is open.
   *
   * The drawer claims `aria-modal`, so the storefront behind it must not move:
   * on mobile a stray page scroll under a full-width sheet is disorienting, and
   * on desktop the backdrop reads as inert. `overflow` on the root element is
   * used rather than a fixed-body scroll lock because the Studio layout offset
   * lives in `body { padding-top }`, which a fixed body would clip.
   */
  useEffect(() => {
    if (!isOpen) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";

    return () => {
      root.style.overflow = previous;
    };
  }, [isOpen]);

  if (!isOpen || !activePanel) {
    return null;
  }

  // Resolve target product or collection safely with discriminated union
  let resolvedProduct;
  if (activePanel.type === "product") {
    const targetId = activePanel.id;
    resolvedProduct =
      (currentProduct && (currentProduct.id === targetId || currentProduct.slug === targetId)
        ? currentProduct
        : undefined) ||
      products.find((p) => p.id === targetId || p.slug === targetId);
  } else if (activePanel.type === "images") {
    const targetId = activePanel.productId;
    resolvedProduct =
      (currentProduct && currentProduct.id === targetId ? currentProduct : undefined) ||
      products.find((p) => p.id === targetId);
  }

  const resolvedCollection =
    activePanel.type === "collection"
      ? (currentCollection && currentCollection.slug === activePanel.slug ? currentCollection : undefined) ||
        collections.find((c) => c.slug === activePanel.slug)
      : undefined;

  const panelTitle =
    activePanel.type === "images"
      ? "Product photos"
      : activePanel.type === "product"
        ? resolvedProduct?.name || "Product editor"
        : resolvedCollection?.title || "Collection editor";

  return (
    <>
      {/* Mobile backdrop: a real button so the dismiss affordance is reachable
          by keyboard and announced, instead of a click-only div. */}
      <button
        type="button"
        aria-label="Close Studio editor panel"
        tabIndex={-1}
        className="fixed inset-0 top-11 z-40 bg-stone-950/40 backdrop-blur-xs sm:hidden cursor-default"
        onClick={closePanel}
      />

      {/* Slide-over panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Studio Mode: ${panelTitle}`}
        className="fixed top-11 bottom-0 right-0 z-50 w-full sm:w-[420px] lg:w-[460px] bg-surface border-l border-border shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200"
      >
        {/* Close Button Anchor */}
        <div className="absolute top-4 right-4 z-10">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closePanel}
            aria-label="Close Studio Panel"
            className="p-1.5 text-muted-foreground hover:text-foreground bg-surface-subtle/80 hover:bg-surface-subtle rounded-xs border border-border transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content based on panel type */}
        {activePanel.type === "product" && (
          resolvedProduct ? (
            <ProductEditor
              product={resolvedProduct}
              focusField={activePanel.focusField}
              onClose={closePanel}
            />
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Product not found in current catalogue session.
            </div>
          )
        )}

        {activePanel.type === "collection" && (
          resolvedCollection ? (
            <CollectionEditor
              collection={resolvedCollection}
              focusField={activePanel.focusField}
              onClose={closePanel}
            />
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Collection not found in current catalogue session.
            </div>
          )
        )}

        {activePanel.type === "images" && (
          resolvedProduct ? (
            <ImageManager product={resolvedProduct} onClose={closePanel} />
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Product photos not found.
            </div>
          )
        )}
      </aside>
    </>
  );
}
