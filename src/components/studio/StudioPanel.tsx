"use client";

import React, { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useStudio } from "@/lib/studio/hooks";
import { useStudioManagement } from "@/lib/studio/management";
import { StudioContentEditor, contentDocumentMeta } from "./StudioContentEditor";
import { readContentValue } from "@/lib/studio/content";
import { hasOpenStudioOverlay, trackStudioOverlay } from "@/lib/studio/overlay";
import {
  managementToCatalogueView,
  managementToCollectionView,
} from "@/lib/studio/derive";
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
  const { products, collections } = useStudioCatalogue();
  const management = useStudioManagement();
  const refreshManagement = management.refresh;
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

  /**
   * The editor renders from the management projection, never from a value
   * captured when the panel opened.
   *
   * That is what makes a save land: the provider replaces the projection on
   * success, this component re-renders, and the editor remounts (see the `key`
   * below) with the persisted values. Rendering from a captured value would
   * leave the panel showing the draft it just saved.
   *
   * The catalogue arrays are only a fallback for the moment before the
   * management projection has loaded; the loading branch below means the editors
   * never mount without it.
   */
  const managedProduct =
    activePanel.type === "product"
      ? // A product target is keyed by id, with slug accepted for convenience.
        (management.productById(activePanel.id) ??
        management.products.find((product) => product.slug === activePanel.id))
      : activePanel.type === "images"
        ? management.productById(activePanel.productId)
        : undefined;

  const managedCollection =
    activePanel.type === "collection"
      ? (management.collectionBySlug(activePanel.slug) ??
        management.collections.find((collection) => collection.id === activePanel.slug))
      : undefined;

  const resolvedProduct = managedProduct
    ? managementToCatalogueView(managedProduct)
    : activePanel.type === "product"
      ? products.find((p) => p.id === activePanel.id || p.slug === activePanel.id)
      : activePanel.type === "images"
        ? products.find((p) => p.id === activePanel.productId)
        : undefined;

  const resolvedCollection = managedCollection
    ? managementToCollectionView(managedCollection)
    : activePanel.type === "collection"
      ? collections.find((c) => c.slug === activePanel.slug)
      : undefined;

  const contentDocument =
    activePanel.type === "content" && management.content
      ? (() => {
          const meta = contentDocumentMeta().find((entry) => entry.key === activePanel.key);
          return {
            document: {
              key: activePanel.key,
              label: meta?.label ?? activePanel.key,
              path: meta?.path ?? "/",
              value: readContentValue(management.content, activePanel.key),
            },
            focusField: activePanel.focusField,
          };
        })()
      : undefined;

  const panelTitle =
    activePanel.type === "images"
      ? "Product photos"
      : activePanel.type === "product"
        ? resolvedProduct?.name || "Product editor"
        : activePanel.type === "content"
          ? (contentDocument?.document.label ?? "Storefront content")
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

        {/* Content based on panel type.

            Each editor is keyed by the record it is editing *and* its version, so
            a save (which advances `updatedAt`) remounts the form on the values the
            server just returned. Without the version in the key, a successful save
            would leave the owner looking at the form state they typed rather than
            the record that was stored. */}
        {activePanel.type === "product" &&
          (management.isLoading && !managedProduct ? (
            <EditorLoading />
          ) : resolvedProduct && managedProduct ? (
            <ProductEditor
              key={`${managedProduct.id}:${managedProduct.updatedAt}`}
              management={managedProduct}
              product={resolvedProduct}
              focusField={activePanel.focusField}
              onClose={closePanel}
              storeCurrency={management.defaultCurrency}
            />
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              This product is not in the catalogue. Reload the page to refresh.
            </div>
          ))}

        {activePanel.type === "content" &&
          (contentDocument ? (
            <div className="p-5">
              <StudioContentEditor
                key={`${contentDocument.document.key}:${JSON.stringify(contentDocument.document.value).length}`}
                document={contentDocument.document}
                onSaved={() => void refreshManagement()}
              />
            </div>
          ) : (
            <EditorLoading />
          ))}

        {activePanel.type === "collection" &&
          (management.isLoading && !managedCollection ? (
            <EditorLoading />
          ) : resolvedCollection && managedCollection ? (
            <CollectionEditor
              key={`${managedCollection.id}:${managedCollection.updatedAt}`}
              management={managedCollection}
              collection={resolvedCollection}
              focusField={activePanel.focusField}
              onClose={closePanel}
            />
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              This collection is not in the catalogue. Reload the page to refresh.
            </div>
          ))}

        {activePanel.type === "images" &&
          (management.isLoading && !managedProduct ? (
            <EditorLoading />
          ) : resolvedProduct && managedProduct ? (
            <ImageManager
              key={`images:${managedProduct.id}`}
              product={resolvedProduct}
              onClose={closePanel}
            />
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Product photos not found.
            </div>
          ))}

        {management.loadError && (
          <div
            role="alert"
            className="mx-4 mb-4 mt-2 p-3 bg-rose-500/10 border border-rose-400/40 text-rose-600 dark:text-rose-400 text-xs rounded-xs"
          >
            {management.loadError}
          </div>
        )}
      </aside>
    </>
  );
}
