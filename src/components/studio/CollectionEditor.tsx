"use client";

import React, { useEffect, useRef, useState } from "react";
import type { CatalogueCollection } from "@/lib/catalogue";
import type { StudioCollectionManagement } from "@/lib/admin/studio-management";
import { useStudio } from "@/lib/studio/hooks";
import { useStudioManagement } from "@/lib/studio/management";
import { revokeBlobUrl, validateImageFile } from "@/lib/studio/derive";
import type { CollectionDraft } from "@/lib/studio/types";
import {
  StudioField,
  StudioInput,
  StudioSwitch,
  StudioTextArea,
} from "./fields";
import { Check, RotateCcw, Upload, Trash2, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

interface CollectionEditorProps {
  /**
   * The authoritative management record, which is the only source that carries
   * the real `is_active`, `featured` and display order for a collection.
   */
  management: StudioCollectionManagement;
  /** The same record projected into the customer-facing shape. */
  collection: CatalogueCollection;
  focusField?: string;
  onClose: () => void;
}

/**
 * Reads the display-order field. Empty means "no explicit order" (NULL).
 */
function parseDisplayOrderInput(value: number | string): number | null {
  if (typeof value === "number") return Number.isInteger(value) ? value : null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? parsed : null;
}

export function CollectionEditor({
  management,
  collection,
  focusField,
  onClose,
}: CollectionEditorProps) {
  const { state, patchCollection } = useStudio();
  const { saveCollection, rebaseCollection, uploadCover, removeCover } = useStudioManagement();
  const draft = state.collectionDrafts[collection.slug] || {};

  const [title, setTitle] = useState(draft.title ?? management.title);
  const [subtitle, setSubtitle] = useState(draft.subtitle ?? management.subtitle);
  const [description, setDescription] = useState(draft.description ?? management.description);
  const [tag, setTag] = useState(draft.tag ?? management.tag ?? "");
  const [isActive, setIsActive] = useState(draft.isActive ?? management.isActive);
  const [featured, setFeatured] = useState(draft.featured ?? management.featured);
  const [displayOrder, setDisplayOrder] = useState<number | string>(
    draft.displayOrder ?? management.displayOrder ?? "",
  );
  /**
   * A file picked from disk is uploaded straight to Storage and the collection is
   * repointed at the persisted URL. The local object URL below exists only for
   * the moment between the pick and the upload finishing, and is released as soon
   * as the real URL arrives.
   */
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [isCoverBusy, setIsCoverBusy] = useState(false);

  /** The persisted cover, falling back to the visitor projection before the
   *  management projection has loaded. */
  const persistedCoverUrl = draft.coverImageUrl ?? management.coverImageUrl ?? collection.coverImageUrl;

  const [savedBanner, setSavedBanner] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  /** The object URL currently shown, tracked so it can always be released. */
  const coverPreviewRef = useRef<string | null>(null);

  /** Replaces the local preview, releasing the object URL it supersedes. */
  const setCoverPreview = (url: string | null) => {
    if (coverPreviewRef.current && coverPreviewRef.current !== url) {
      revokeBlobUrl(coverPreviewRef.current);
    }
    coverPreviewRef.current = url;
    setCoverPreviewUrl(url);
  };

  // Release the final local preview when the editor unmounts.
  useEffect(() => {
    return () => {
      revokeBlobUrl(coverPreviewRef.current);
      coverPreviewRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (focusField) {
      const el = document.getElementById(`studio-col-${focusField}`);
      if (el) el.focus();
    }
  }, [focusField]);

  /**
   * Uploads a cover picked from disk.
   *
   * A local preview is shown while the file is in flight, then released the
   * moment the real Storage URL comes back — so what the owner ends up looking at
   * is the persisted object, not a blob that dies with the document.
   */
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || "Invalid image file");
      return;
    }

    setErrorMessage(null);
    setSavedBanner(null);
    setCoverPreview(URL.createObjectURL(file));
    setIsCoverBusy(true);

    try {
      const result = await uploadCover(management.id, file);
      if (!result.success) {
        setErrorMessage(result.message ?? "The cover could not be uploaded.");
        setCoverPreview(null);
        return;
      }
      setCoverPreview(null);
      showBanner("Cover uploaded and saved.");
    } finally {
      setIsCoverBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveCover = async () => {
    setErrorMessage(null);
    setIsCoverBusy(true);
    try {
      const result = await removeCover(management.id);
      if (!result.success) {
        setErrorMessage(result.message ?? "The cover could not be removed.");
        return;
      }
      setCoverPreview(null);
      showBanner("Cover removed.");
    } finally {
      setIsCoverBusy(false);
    }
  };

  /**
   * Persists the text fields through the management provider.
   *
   * The cover is not part of this payload: it is already saved by its own upload
   * action, and re-sending it would let a stale editor resurrect a cover the
   * owner just deleted.
   */
  const handleSave = async () => {
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage("A collection needs a title before it can be saved.");
      return;
    }

    const updatedDraft: CollectionDraft = {
      title: title.trim(),
      subtitle: subtitle.trim(),
      description: description.trim(),
      tag: tag.trim(),
      isActive,
      featured,
      displayOrder: parseDisplayOrderInput(displayOrder),
    };

    setIsSaving(true);
    patchCollection(collection.slug, updatedDraft);

    try {
      const result = await saveCollection(management.id, updatedDraft);
      if (result.success) {
        showBanner("Saved. The storefront now shows the published values.");
        return;
      }
      setErrorMessage(result.message ?? "The collection could not be saved.");
      if (result.conflict) syncFormFromServer();
    } finally {
      setIsSaving(false);
    }
  };

  /** Re-reads every field from the current authoritative record. */
  const syncFormFromServer = () => {
    setTitle(management.title);
    setSubtitle(management.subtitle);
    setDescription(management.description);
    setTag(management.tag ?? "");
    setIsActive(management.isActive);
    setFeatured(management.featured);
    setDisplayOrder(management.displayOrder ?? "");
  };

  /** Discards local edits and returns to the latest saved values. */
  const handleRevert = () => {
    rebaseCollection(management.id);
    setCoverPreview(null);
    syncFormFromServer();
    setErrorMessage(null);
    showBanner("Reverted to the saved catalogue values.", 3000);
  };

  const showBanner = (message: string, ms = 4000) => {
    setSavedBanner(message);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => setSavedBanner(null), ms);
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-5">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <span className="eyebrow text-accent">Collection Editor</span>
        <h2 className="font-display text-xl text-foreground font-normal line-clamp-1">
          {title || collection.title}
        </h2>
        <span className="text-[10px] font-mono text-muted-foreground uppercase">
          Slug: {collection.slug}
        </span>
      </div>

      {savedBanner && (
        <div className="p-3 bg-emerald-950/20 dark:bg-emerald-950/50 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in-50 rounded-xs">
          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{savedBanner}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-500/10 border border-rose-400/40 text-rose-600 dark:text-rose-400 text-xs rounded-xs">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* Title */}
        <StudioField label="Collection Title" htmlFor="studio-col-title">
          <StudioInput
            id="studio-col-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Core Edit"
          />
        </StudioField>

        {/* Subtitle */}
        <StudioField label="Subtitle" htmlFor="studio-col-subtitle" hint="Short tagline">
          <StudioInput
            id="studio-col-subtitle"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="e.g. Essential Studio Silhouettes"
          />
        </StudioField>

        {/* Tag */}
        <StudioField label="Eyebrow Tag" htmlFor="studio-col-tag" hint="Shown above title">
          <StudioInput
            id="studio-col-tag"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="e.g. Featured Series"
          />
        </StudioField>

        {/* Description */}
        <StudioField label="Curatorial Statement" htmlFor="studio-col-description">
          <StudioTextArea
            id="studio-col-description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Editorial description of the collection..."
          />
        </StudioField>

        {/* Cover Image */}
        <StudioField label="Lookbook Cover Image" hint="Visual banner for lookbooks">
          <div className="flex flex-col gap-3 p-3 border border-border bg-surface-subtle/20 rounded-xs">
            {coverPreviewUrl ? (
              <div className="relative aspect-video w-full overflow-hidden bg-surface-subtle border border-border rounded-xs">
                <Image
                  src={coverPreviewUrl}
                  alt={`${title} cover preview`}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-stone-900/80 p-1 rounded-xs backdrop-blur-xs">
                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                        fileInputRef.current.click();
                      }
                    }}
                    className="p-1 text-stone-300 hover:text-stone-100 transition-colors cursor-pointer"
                    title="Replace image"
                    aria-label="Replace cover image"
                  >
                    <Upload className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveCover}
                    className="p-1 text-rose-400 hover:text-rose-200 transition-colors cursor-pointer"
                    title="Remove cover image"
                    aria-label="Remove cover image"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : persistedCoverUrl ? (
              <div className="relative aspect-video w-full overflow-hidden bg-surface-subtle border border-border rounded-xs">
                <Image
                  src={persistedCoverUrl}
                  alt={title}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-stone-900/80 p-1 rounded-xs backdrop-blur-xs">
                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                        fileInputRef.current.click();
                      }
                    }}
                    className="p-1 text-stone-300 hover:text-stone-100 transition-colors cursor-pointer"
                    title="Replace image"
                    aria-label="Replace cover image"
                  >
                    <Upload className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveCover}
                    className="p-1 text-rose-400 hover:text-rose-200 transition-colors cursor-pointer"
                    title="Remove cover image"
                    aria-label="Remove cover image"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                    fileInputRef.current.click();
                  }
                }}
                className="border border-dashed border-border hover:border-accent p-6 flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-colors bg-background rounded-xs"
              >
                <ImageIcon className="w-6 h-6 text-muted-foreground" />
                <span className="text-xs text-foreground font-medium">Click to choose a cover photo</span>
                <span className="text-[10px] text-muted-foreground">PNG, JPG, or WebP up to 10MB</span>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              aria-label="Choose a cover image"
              onChange={handleImageFileChange}
            />

            {isCoverBusy && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                <Upload className="w-3 h-3 shrink-0 animate-pulse" />
                <span>Uploading cover…</span>
              </span>
            )}

            <span className="text-[10px] text-muted-foreground leading-relaxed">
              Covers upload straight to Storage and are saved immediately. The previous
              object is removed once the new one is recorded.
            </span>
          </div>
        </StudioField>

        {/* Display Order */}
        <StudioField label="Display Order" htmlFor="studio-col-order" hint="Lower appears first">
          <StudioInput
            id="studio-col-order"
            type="number"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(e.target.value)}
          />
        </StudioField>

        {/* Visibility Switches */}
        <div className="flex flex-col gap-2 pt-2 border-t border-border">
          <StudioSwitch
            id="studio-col-active"
            label="Active Catalogue Status"
            description="Inactive collections and their products are hidden from customers."
            checked={isActive}
            onChange={setIsActive}
          />
          <StudioSwitch
            id="studio-col-featured"
            label="Featured Hero Collection"
            description="Grants this series hero banner treatment on /collections."
            checked={featured}
            onChange={setFeatured}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-border mt-2 sticky bottom-0 bg-surface py-2">
        <button
          type="button"
          onClick={handleRevert}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Revert</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="px-4 py-2 bg-foreground text-background text-xs font-mono uppercase tracking-[0.16em] rounded-xs hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Draft"}
          </button>
        </div>
      </div>
    </div>
  );
}
