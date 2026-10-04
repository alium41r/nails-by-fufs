"use client";

import React, { useEffect, useRef, useState } from "react";
import type { CatalogueCollection } from "@/lib/catalogue";
import { useStudio } from "@/lib/studio/hooks";
import { studioAdapter } from "@/lib/studio/adapter";
import { isBlobUrl, revokeBlobUrl, validateImageFile } from "@/lib/studio/derive";
import type { CollectionDraft } from "@/lib/studio/types";
import {
  StudioField,
  StudioInput,
  StudioSwitch,
  StudioTextArea,
} from "./fields";
import { Check, RotateCcw, Upload, Trash2, Image as ImageIcon, AlertCircle } from "lucide-react";
import Image from "next/image";

interface CollectionEditorProps {
  collection: CatalogueCollection;
  focusField?: string;
  onClose: () => void;
}

export function CollectionEditor({ collection, focusField, onClose }: CollectionEditorProps) {
  const { state, patchCollection, resetCollection, markSaved } = useStudio();
  const draft = state.collectionDrafts[collection.slug] || {};

  const [title, setTitle] = useState(draft.title ?? collection.title);
  const [subtitle, setSubtitle] = useState(draft.subtitle ?? collection.subtitle);
  const [description, setDescription] = useState(draft.description ?? collection.description);
  const [tag, setTag] = useState(draft.tag ?? collection.tag ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(
    draft.coverImageUrl !== undefined ? draft.coverImageUrl : collection.coverImageUrl
  );
  /**
   * A file picked from disk has no Storage URL yet. It is previewed from a local
   * object URL that is deliberately NOT written into the draft: drafts are
   * persisted to `sessionStorage`, and a blob URL is dead the moment the
   * document that created it goes away.
   */
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(draft.isActive ?? true);
  const [featured, setFeatured] = useState(draft.featured ?? collection.featured);
  const [displayOrder, setDisplayOrder] = useState<number | string>(draft.displayOrder ?? 0);

  const [savedBanner, setSavedBanner] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || "Invalid image file");
      return;
    }

    setErrorMessage(null);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleRemoveCover = () => {
    setCoverPreview(null);
    setCoverImageUrl(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    const orderNum = typeof displayOrder === "string" ? parseInt(displayOrder, 10) : displayOrder;

    const trimmedCover = coverImageUrl?.trim() || null;

    const updatedDraft: CollectionDraft = {
      title: title.trim(),
      subtitle: subtitle.trim(),
      description: description.trim(),
      tag: tag.trim(),
      // A locally picked file is preview-only; a blob URL must never be persisted.
      coverImageUrl: isBlobUrl(trimmedCover) ? null : trimmedCover,
      isActive,
      featured,
      displayOrder: isNaN(orderNum) ? 0 : orderNum,
    };

    try {
      patchCollection(collection.slug, updatedDraft);
      const result = await studioAdapter.saveCollection(collection.slug, updatedDraft);
      markSaved(collection.slug);
      setSavedBanner(
        result.message ||
          (coverPreviewUrl
            ? "Collection draft saved. The cover file you picked is a local preview only until Storage upload is wired."
            : "Collection draft saved to this browser session.")
      );
      setTimeout(() => setSavedBanner(null), 4000);
    } catch (error) {
      setErrorMessage(
        `Saving the collection failed: ${
          error instanceof Error ? error.message : "unexpected error"
        }`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevert = () => {
    resetCollection(collection.slug);
    setCoverPreview(null);
    setTitle(collection.title);
    setSubtitle(collection.subtitle);
    setDescription(collection.description);
    setTag(collection.tag ?? "");
    setCoverImageUrl(collection.coverImageUrl);
    setIsActive(true);
    setFeatured(collection.featured);
    setDisplayOrder(0);
    setErrorMessage(null);
    setSavedBanner("Reverted edits to original collection data.");
    setTimeout(() => setSavedBanner(null), 3000);
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
            ) : coverImageUrl ? (
              <div className="relative aspect-video w-full overflow-hidden bg-surface-subtle border border-border rounded-xs">
                <Image
                  src={coverImageUrl}
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

            {coverPreviewUrl && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-start gap-1.5 leading-relaxed">
                <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                <span>
                  Local preview only — this file uploads to Storage when the cover upload
                  is wired. Nothing has been saved for it yet.
                </span>
              </span>
            )}

            <div className="flex items-center gap-2">
              <label
                htmlFor="studio-col-cover-url"
                className="text-[10px] font-mono uppercase text-muted-foreground shrink-0"
              >
                Or URL:
              </label>
              <StudioInput
                id="studio-col-cover-url"
                value={coverImageUrl || ""}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://..."
                className="h-8 text-xs"
              />
            </div>
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
