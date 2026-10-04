"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { CatalogueProduct } from "@/lib/catalogue";
import { useStudio, useStudioImages } from "@/lib/studio/hooks";
import { studioStore } from "@/lib/studio/store";
import { studioAdapter } from "@/lib/studio/adapter";
import {
  moveImage,
  normalizeStudioImages,
  removeStudioImage,
  replaceStudioImage,
  validateImageFile,
  withImageAlt,
} from "@/lib/studio/derive";
import { StudioInput } from "./fields";
import {
  Star,
  ArrowUp,
  ArrowDown,
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
   * Every mutation reads the store's current image list instead of the value
   * captured when this render was created. Two quick clicks in one tick used to
   * both start from the same snapshot, so the second write silently discarded
   * the first edit.
   */
  const currentImages = () => studioStore.getSnapshot().productImages[product.id] ?? studioImages;

  const updateImages = (
    updater: (images: typeof studioImages) => typeof studioImages
  ) => {
    studioStore.updateProductImages(product.id, updater);
  };

  /**
   * The adapter seam can reject once it talks to the server, so every mutation
   * is guarded: a thrown error surfaces in the panel instead of leaving a
   * silently dead button or a permanently disabled control.
   */
  const runAdapterCall = async (label: string, call: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await call();
      return true;
    } catch (error) {
      setSuccessBanner(null);
      setErrorMessage(
        `${label} could not be completed: ${
          error instanceof Error ? error.message : "unexpected error"
        }`
      );
      return false;
    } finally {
      setBusy(false);
    }
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
    let result;
    try {
      result = await studioAdapter.uploadImage(product.id, file);
    } catch (error) {
      setErrorMessage(
        `Upload could not be completed: ${
          error instanceof Error ? error.message : "unexpected error"
        }`
      );
      return;
    }

    if (!result.success || !result.image) {
      setErrorMessage(result.message || "Upload failed.");
      return;
    }

    const newImage = result.image;
    updateImages((images) => [...images, newImage]);
    setAltTexts((prev) => ({ ...prev, [newImage.id]: newImage.alt }));
    notifySuccess(
      result.persisted
        ? "Photograph uploaded."
        : "Photograph added to this browser session preview only."
    );
  };

  // Replace existing image
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
    const ok = await runAdapterCall("Replacing the photograph", async () => {
      const res = await studioAdapter.replaceImage(product.id, targetId, file);
      if (!res.success || !res.url) {
        throw new Error(res.message || "The replacement was rejected.");
      }
      // The store revokes the previous URL if it was a local blob preview.
      updateImages((images) => replaceStudioImage(images, targetId, res.url!, file));
    });

    setReplacingId(null);
    if (ok) notifySuccess("Photograph replaced in this browser session preview only.");
  };

  // Set primary: gallery order defines the cover, so this promotes to first.
  const handleSetPrimary = async (imageId: string) => {
    const ok = await runAdapterCall("Setting the cover photograph", async () => {
      const res = await studioAdapter.setPrimaryImage(product.id, imageId);
      if (!res.success) throw new Error(res.message || "The change was rejected.");
      updateImages((images) => {
        const current = images.find((image) => image.id === imageId);
        if (!current || images[0]?.id === imageId) return images;
        return normalizeStudioImages([
          current,
          ...images.filter((image) => image.id !== imageId),
        ]);
      });
    });
    if (ok) notifySuccess("Cover photograph updated.");
  };

  // Move up / down
  const handleMove = async (imageId: string, direction: "up" | "down") => {
    const before = currentImages();
    const reordered = moveImage(before, imageId, direction);
    if (reordered === before) return;

    await runAdapterCall("Reordering the gallery", async () => {
      const res = await studioAdapter.reorderImages(
        product.id,
        reordered.map((image) => image.id)
      );
      if (!res.success) throw new Error(res.message || "The new order was rejected.");
      updateImages(() => reordered);
    });
  };

  // Delete
  const handleDelete = async (imageId: string) => {
    const ok = await runAdapterCall("Removing the photograph", async () => {
      const res = await studioAdapter.deleteImage(product.id, imageId);
      if (!res.success) throw new Error(res.message || "The removal was rejected.");
      updateImages((images) => removeStudioImage(images, imageId));
    });
    if (ok) notifySuccess("Photograph removed from this browser session preview only.");
  };

  // Alt text change
  const handleAltBlur = async (imageId: string, alt: string) => {
    const current = currentImages().find((image) => image.id === imageId);
    if (!current || current.alt === alt) return;

    const ok = await runAdapterCall("Updating the alt description", async () => {
      const res = await studioAdapter.updateImageAlt(product.id, imageId, alt);
      if (!res.success) throw new Error(res.message || "The change was rejected.");
      updateImages((images) => withImageAlt(images, imageId, alt));
    });
    if (ok) notifySuccess("Alt description updated.");
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
                  className={cn(
                    "p-3 border rounded-xs bg-surface flex flex-col gap-3 transition-colors",
                    img.isPrimary ? "border-accent/60 ring-1 ring-accent/30" : "border-border"
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
                        <span className="text-[11px] font-mono text-muted-foreground">
                          Shot 0{idx + 1}
                        </span>

                        <div className="flex items-center gap-1">
                          {/* Promote to cover (gallery order defines the cover) */}
                          {!img.isPrimary && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleSetPrimary(img.id)}
                              className="p-1 text-muted-foreground hover:text-accent disabled:opacity-30 transition-colors cursor-pointer"
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
                            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors cursor-pointer"
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
                            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors cursor-pointer"
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
                            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors cursor-pointer"
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
                            className="p-1 text-rose-500 hover:text-rose-700 disabled:opacity-30 transition-colors cursor-pointer"
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
