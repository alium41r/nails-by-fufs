"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { CatalogueProduct } from "@/lib/catalogue";
import { useStudio, useStudioImages } from "@/lib/studio/hooks";
import { useStudioManagement } from "@/lib/studio/management";
import { studioStore } from "@/lib/studio/store";
import { moveImage, validateImageFile } from "@/lib/studio/derive";
import type { StudioImage, StudioSaveResult } from "@/lib/studio/types";
import { StudioInput } from "./fields";
import {
  Star,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Trash2,
  Upload,
  Plus,
  Image as ImageIcon,
  Check,
  AlertCircle,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ImageManagerProps {
  product: CatalogueProduct;
  onClose: () => void;
}

export function ImageManager({ product, onClose }: ImageManagerProps) {
  const { studioImages } = useStudioImages(product);
  const { openProductEditor } = useStudio();
  const {
    uploadImage,
    deleteImage,
    reorderImages,
    updateImageAlt,
  } = useStudioManagement();
  /** The image a file picker is currently replacing, if any. */
  const replacingIdRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /**
   * Alt text is edited locally and only written to the draft on blur, so the
   * input value is reconciled against the draft on every render. Entries are
   * keyed by image id and simply never read again once the image is gone, which
   * keeps a stale value from surviving a delete/re-add cycle without needing an
   * effect to prune it.
   */
  const [altTexts, setAltTexts] = useState<Record<string, string>>({});
  /** The shot currently being dragged, so a drop onto itself is a no-op. */
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const altValueFor = (id: string, fallback: string) => altTexts[id] ?? fallback;

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  const notifySuccess = (msg: string) => {
    setSuccessBanner(msg);
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => setSuccessBanner(null), 3500);
  };

  /**
   * Mutations no longer accumulate in the local store.
   *
   * Each one is a real server write: the provider sends it to the existing
   * admin-authorised action, the server returns the whole persisted gallery, and
   * the provider replaces the projection. The editor therefore renders database
   * metadata — real ids, sort order, primary flag and alt text — and never has to
   * reconcile a local list against the server's.
   *
   * The store is still used for one thing: the temporary blob preview created
   * between picking a file and the upload completing. It is released as soon as
   * the persisted URL arrives.
   */
  const currentImages = () => studioStore.getSnapshot().productImages[product.id] ?? studioImages;

  /**
   * Reports a failed write. A conflict is called out separately because it means
   * the gallery changed elsewhere and retrying blindly would clobber it.
   */
  const reportFailure = (label: string, result: { message?: string; conflict?: boolean }) => {
    setSuccessBanner(null);
    setErrorMessage(
      result.conflict
        ? (result.message ?? `${label} failed: this product changed elsewhere. Reload and try again.`)
        : (result.message ?? `${label} failed. Please try again.`),
    );
  };

  /** Shows a local preview for the file being uploaded, releasing the last one. */
  const showLocalPreview = (image: StudioImage) => {
    const preview = { ...image, url: URL.createObjectURL(image.file as File) };
    studioStore.updateProductImages(product.id, (images) => {
      // Replace the preview if this upload is replacing an existing image.
      const withoutTarget = replacingIdRef.current
        ? images.filter((existing) => existing.id !== replacingIdRef.current)
        : images.filter((existing) => existing.id !== preview.id);
      return [...withoutTarget, preview];
    });
  };

  /** Replaces any local preview with the persisted gallery. */
  const clearLocalPreviews = () => {
    studioStore.resetProductImages(product.id);
  };

  // Upload new image
  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || "Invalid file");
      return;
    }

    setErrorMessage(null);
    setBusy(true);
    replacingIdRef.current = null;
    showLocalPreview({
      id: `local-${Date.now()}`,
      url: null,
      alt: file.name.replace(/\.[^/.]+$/, ""),
      isPrimary: false,
      sortOrder: 999,
      ratio: "portrait",
      file,
    });

    try {
      const result = await uploadImage(product.id, file);
      if (!result.success) {
        reportFailure("Uploading the photograph", result);
        return;
      }
      clearLocalPreviews();
      notifySuccess("Photograph uploaded and saved.");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Replace existing image: the server places the new row where the old one sat.
  const handleReplaceFile = async (files: FileList | null) => {
    const targetId = replacingId;
    if (!files || files.length === 0 || !targetId) return;

    const file = files[0];
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || "Invalid file");
      setReplacingId(null);
      return;
    }

    setErrorMessage(null);
    setBusy(true);
    replacingIdRef.current = targetId;

    try {
      const result = await uploadImage(product.id, file, targetId);
      if (!result.success) reportFailure("Replacing the photograph", result);
      else {
        clearLocalPreviews();
        notifySuccess("Photograph replaced and saved.");
      }
    } finally {
      replacingIdRef.current = null;
      setReplacingId(null);
      setBusy(false);
      if (replaceInputRef.current) replaceInputRef.current.value = "";
    }
  };

  /**
   * Promotes a photograph to the cover.
   *
   * The cover is defined by gallery position (first image), and the server
   * assigns `is_primary` while reordering. Sending the whole order therefore sets
   * position and cover flag in one write, which is also what keeps the partial
   * unique index on primary images satisfiable.
   */
  const handleSetPrimary = async (imageId: string) => {
    const images = currentImages();
    if (images[0]?.id === imageId) return;

    const reordered = [
      ...images.filter((image) => image.id === imageId),
      ...images.filter((image) => image.id !== imageId),
    ];
    await runWrite("Setting the cover photograph", () =>
      reorderImages(
        product.id,
        reordered.map((image) => image.id),
      ),
    );
  };

  /**
   * Drops one shot at another's position.
   *
   * Reuses `reorderImages` with the whole resulting order, which is the same
   * contract the up/down buttons use — so a drag and a click cannot disagree
   * about what "the order" means, and the server still sets the primary flag from
   * position in one write.
   */
  const handleDragReorder = async (draggedId: string, targetId: string) => {
    const before = currentImages();
    const from = before.findIndex((image) => image.id === draggedId);
    const to = before.findIndex((image) => image.id === targetId);
    if (from === -1 || to === -1 || from === to) return;

    const reordered = [...before];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);

    await runWrite("Reordering the gallery", () =>
      reorderImages(
        product.id,
        reordered.map((image) => image.id),
      ),
    );
  };

  // Move up / down
  const handleMove = async (imageId: string, direction: "up" | "down") => {
    const before = currentImages();
    const reordered = moveImage(before, imageId, direction);
    if (reordered === before) return;

    await runWrite("Reordering the gallery", () =>
      reorderImages(
        product.id,
        reordered.map((image) => image.id),
      ),
    );
  };

  // Delete
  const handleDelete = async (imageId: string) => {
    await runWrite("Removing the photograph", () => deleteImage(product.id, imageId));
  };

  // Alt text change
  const handleAltBlur = async (imageId: string, alt: string) => {
    const current = currentImages().find((image) => image.id === imageId);
    if (!current || current.alt === alt) return;

    const ok = await runWrite("Updating the alt description", () =>
      updateImageAlt(product.id, imageId, alt),
    );
    if (ok) setAltTexts((prev) => ({ ...prev, [imageId]: alt }));
  };

  /** Runs a write, reporting the outcome and clearing local previews on success. */
  const runWrite = async (
    label: string,
    run: () => Promise<StudioSaveResult>,
  ): Promise<boolean> => {
    setBusy(true);
    setErrorMessage(null);
    try {
      const result = await run();
      if (!result.success) {
        reportFailure(label, result);
        return false;
      }
      clearLocalPreviews();
      notifySuccess(`${label.replace(/^\w/, (c) => c.toUpperCase())} saved.`);
      return true;
    } catch (error) {
      setErrorMessage(
        `${label} failed: ${error instanceof Error ? error.message : "unexpected error"}`,
      );
      return false;
    } finally {
      setBusy(false);
    }
  };

  const imageCountLabel = useMemo(
    () => `${studioImages.length} ${studioImages.length === 1 ? "Image" : "Images"}`,
    [studioImages.length]
  );

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <span className="eyebrow text-accent">Media Management</span>
          <h2 className="font-display text-xl text-foreground font-normal line-clamp-1">
            {product.name} Gallery
          </h2>
          <span className="text-[10px] font-mono text-muted-foreground uppercase">
            {imageCountLabel}
          </span>
        </div>

        <button
          type="button"
          onClick={() => openProductEditor(product.id)}
          className="text-xs text-muted-foreground hover:text-accent font-mono uppercase underline-offset-4 hover:underline cursor-pointer"
        >
          ← Edit Details
        </button>
      </div>

      {successBanner && (
        <div className="p-3 bg-emerald-950/20 dark:bg-emerald-950/50 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 rounded-xs animate-in fade-in-50">
          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-500/10 border border-rose-400/40 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 rounded-xs">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Upload Drop Area */}
      <div
        onClick={() => {
          if (fileInputRef.current) {
            // Reset first so re-picking the same file still fires change.
            fileInputRef.current.value = "";
            fileInputRef.current.click();
          }
        }}
        className="border-2 border-dashed border-border hover:border-accent p-6 flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-colors bg-surface-subtle/30 rounded-xs group"
      >
        <div className="p-2.5 rounded-full bg-surface border border-border group-hover:border-accent transition-colors">
          <Plus className="w-5 h-5 text-accent" />
        </div>
        <span className="text-xs text-foreground font-medium">
          Add New Product Photograph
        </span>
        <span className="text-[11px] text-muted-foreground">
          PNG, JPG, WebP up to 10MB • Recommended 4:5 portrait ratio
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          aria-label="Add a product photograph"
          onChange={(e) => handleUploadFiles(e.target.files)}
        />
      </div>

      {/* Hidden file input for Replace */}
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="Choose a replacement photograph"
        onChange={(e) => handleReplaceFile(e.target.files)}
      />

      {/* Image List */}
      <div className="flex flex-col gap-3">
        <span className="text-[11px] uppercase tracking-wider font-mono text-muted-foreground">
          Current Gallery Shots ({studioImages.length})
        </span>

        {studioImages.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground border border-border bg-surface-subtle/20 leading-relaxed">
            This set has no photography yet, so the storefront shows the
            &ldquo;Awaiting Photography&rdquo; placeholder. Adding a photo here replaces that
            placeholder with your first shot.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {studioImages.map((img, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === studioImages.length - 1;

              return (
                <div
                  key={img.id}
                  // Native HTML5 drag, as on the catalogue lists: no dependency,
                  // and it coexists with the up/down buttons, which stay for
                  // keyboard and touch users.
                  draggable
                  onDragStart={() => setDraggingId(img.id)}
                  onDragEnd={() => setDraggingId(null)}
                  onDragOver={(event) => {
                    if (draggingId && draggingId !== img.id) event.preventDefault();
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (draggingId && draggingId !== img.id) {
                      void handleDragReorder(draggingId, img.id);
                    }
                    setDraggingId(null);
                  }}
                  className={cn(
                    "p-3 border rounded-xs bg-surface flex flex-col gap-3 transition-colors",
                    img.isPrimary ? "border-accent/60 ring-1 ring-accent/30" : "border-border",
                    draggingId === img.id && "opacity-60 border-accent",
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Thumbnail preview */}
                    <div className="relative w-16 h-20 bg-surface-subtle border border-border rounded-xs overflow-hidden shrink-0">
                      {img.url ? (
                        <Image
                          src={img.url}
                          alt={img.alt}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center bg-surface-subtle">
                          <ImageIcon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-[8px] font-mono text-muted-foreground line-clamp-1">
                            Placeholder
                          </span>
                        </div>
                      )}

                      {img.isPrimary && (
                        <span className="absolute top-1 left-1 bg-accent text-accent-foreground text-[8px] uppercase tracking-widest px-1 py-0.5 font-mono shadow-xs">
                          Primary
                        </span>
                      )}
                    </div>

                    {/* Metadata & Controls */}
                    <div className="flex-1 flex flex-col justify-between min-h-[80px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
                          <GripVertical
                            className="h-3.5 w-3.5 cursor-grab"
                            aria-hidden="true"
                          />
                          Shot 0{idx + 1}
                        </span>

                        <div className="flex items-center gap-1">
                          {/* Promote to cover (gallery order defines the cover) */}
                          {!img.isPrimary && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleSetPrimary(img.id)}
                              className="touch-target inline-flex items-center justify-center p-1 text-muted-foreground hover:text-accent disabled:opacity-30 transition-colors cursor-pointer"
                              title="Make this the cover photograph"
                              aria-label={`Make shot 0${idx + 1} the cover photograph`}
                            >
                              <Star className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Reorder Up */}
                          <button
                            type="button"
                            disabled={isFirst || busy}
                            onClick={() => handleMove(img.id, "up")}
                            className="touch-target inline-flex items-center justify-center p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors cursor-pointer"
                            title="Move up"
                            aria-label={`Move shot 0${idx + 1} up`}
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>

                          {/* Reorder Down */}
                          <button
                            type="button"
                            disabled={isLast || busy}
                            onClick={() => handleMove(img.id, "down")}
                            className="touch-target inline-flex items-center justify-center p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors cursor-pointer"
                            title="Move down"
                            aria-label={`Move shot 0${idx + 1} down`}
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          {/* Replace */}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setReplacingId(img.id);
                              if (replaceInputRef.current) {
                                // Reset first so re-picking the same file still fires change.
                                replaceInputRef.current.value = "";
                                replaceInputRef.current.click();
                              }
                            }}
                            className="touch-target inline-flex items-center justify-center p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors cursor-pointer"
                            title="Replace photograph"
                            aria-label={`Replace shot 0${idx + 1}`}
                          >
                            <Upload className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleDelete(img.id)}
                            className="touch-target inline-flex items-center justify-center p-1 text-rose-500 hover:text-rose-700 disabled:opacity-30 transition-colors cursor-pointer"
                            title="Remove photograph"
                            aria-label={`Remove shot 0${idx + 1}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Alt Text Input */}
                      <div className="flex flex-col gap-1 pt-1">
                        <label
                          htmlFor={`studio-alt-${img.id}`}
                          className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground"
                        >
                          Alt Description
                        </label>
                        <StudioInput
                          id={`studio-alt-${img.id}`}
                          value={altValueFor(img.id, img.alt)}
                          onChange={(e) =>
                            setAltTexts((prev) => ({ ...prev, [img.id]: e.target.value }))
                          }
                          onBlur={(e) => handleAltBlur(img.id, e.target.value)}
                          placeholder="Accessible image description..."
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-border mt-2 sticky bottom-0 bg-surface py-2 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-foreground text-background text-xs font-mono uppercase tracking-[0.16em] rounded-xs hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
}
