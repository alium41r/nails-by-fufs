"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { UploadedReferenceImage } from "@/data/custom-order";
import { Image as ImageIcon, Plus, AlertCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ReferenceUploaderProps {
  images: UploadedReferenceImage[];
  onChange: (images: UploadedReferenceImage[]) => void;
  maxFiles?: number;
  maxSizeBytes?: number; // default 10MB
}

const DEFAULT_MAX_FILES = 6;
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ReferenceUploader({
  images,
  onChange,
  maxFiles = DEFAULT_MAX_FILES,
  maxSizeBytes = DEFAULT_MAX_SIZE,
}: ReferenceUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Clean up object URLs when images change or component unmounts
  const imagesRef = useRef(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((img) => {
        if (img.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(img.previewUrl);
        }
      });
    };
  }, []);

  const handleProcessFiles = useCallback(
    (files: FileList | File[]) => {
      setErrorMessage(null);
      const newImages: UploadedReferenceImage[] = [];
      const fileArray = Array.from(files);

      if (images.length + fileArray.length > maxFiles) {
        setErrorMessage(`You can upload up to ${maxFiles} reference images in total.`);
        return;
      }

      for (const file of fileArray) {
        // Validation: mime type
        if (!file.type.startsWith("image/")) {
          setErrorMessage(`"${file.name}" is not a supported image file.`);
          continue;
        }

        // Validation: size
        if (file.size > maxSizeBytes) {
          setErrorMessage(
            `"${file.name}" is larger than the ${formatBytes(maxSizeBytes)} limit.`
          );
          continue;
        }

        const previewUrl = URL.createObjectURL(file);
        newImages.push({
          id: `ref-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          file,
          previewUrl,
          name: file.name,
          sizeFormatted: formatBytes(file.size),
        });
      }

      if (newImages.length > 0) {
        onChange([...images, ...newImages]);
      }
    },
    [images, maxFiles, maxSizeBytes, onChange]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFiles(e.target.files);
      // Reset input value so re-selecting the same file fires change
      e.target.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFiles(e.dataTransfer.files);
    }
  };

  const handleRemove = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const target = images.find((img) => img.id === id);
    if (target && target.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(target.previewUrl);
    }
    onChange(images.filter((img) => img.id !== id));
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.preventDefault();
    images.forEach((img) => {
      if (img.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(img.previewUrl);
      }
    });
    onChange([]);
  };

  const isMaxReached = images.length >= maxFiles;

  return (
    <div className="flex flex-col gap-3.5 w-full text-left">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/heic,image/gif"
        onChange={handleFileInputChange}
        className="sr-only"
        aria-label="Upload reference inspiration images"
      />

      {/* Main Upload Dropzone Frame */}
      <div
        onClick={() => !isMaxReached && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !isMaxReached) {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className={cn(
          "relative border border-dashed transition-all duration-200 p-6 sm:p-8 flex flex-col items-center justify-center text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
          isDragging
            ? "border-accent bg-accent-subtle/40 ring-1 ring-accent"
            : "border-border hover:border-foreground/40 bg-surface",
          isMaxReached ? "opacity-75 cursor-default" : "cursor-pointer"
        )}
      >
        <div className="flex flex-col items-center gap-2.5 max-w-sm">
          <div className="w-10 h-10 rounded-full bg-surface-subtle border border-border flex items-center justify-center text-accent">
            <ImageIcon className="h-5 w-5" />
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-xs sm:text-sm font-medium text-foreground">
              {isMaxReached ? (
                "Maximum reference images attached"
              ) : (
                <>
                  <span className="text-accent underline underline-offset-4">
                    Click to select photos
                  </span>{" "}
                  <span className="hidden sm:inline">or drag & drop</span>
                </>
              )}
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Screenshots, sketches, color swatches, or nail looks you love (PNG, JPG, WebP up to 10MB).
            </p>
          </div>

          <div className="pt-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground bg-surface-subtle px-2 py-0.5 border border-border/80">
              {images.length} / {maxFiles} Attached
            </span>
          </div>
        </div>
      </div>

      {/* Error Message Feedback */}
      {errorMessage && (
        <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 p-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Uploaded Thumbnail Gallery */}
      {images.length > 0 && (
        <div className="flex flex-col gap-2.5 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-medium">
              Attached References ({images.length})
            </span>

            {images.length > 1 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] font-mono text-rose-600 hover:text-rose-700 hover:underline cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
                <span>Remove All</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {images.map((img, index) => (
              <div
                key={img.id}
                className="group relative border border-border bg-surface-subtle overflow-hidden flex flex-col shadow-xs"
              >
                {/* Image Preview */}
                <div className="relative aspect-square w-full bg-neutral-900/5 flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.previewUrl}
                    alt={`Reference ${index + 1}: ${img.name}`}
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />

                  {/* Top-Right Floating Delete Icon Button (High Contrast) */}
                  <button
                    type="button"
                    onClick={(e) => handleRemove(img.id, e)}
                    aria-label={`Delete reference image ${img.name}`}
                    title="Delete image"
                    className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white dark:bg-neutral-900 text-rose-600 border border-border shadow-md flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <span className="absolute bottom-2 left-2 text-[10px] font-mono bg-surface/95 text-foreground px-2 py-0.5 border border-border/80 shadow-xs">
                    #{index + 1}
                  </span>
                </div>

                {/* File Metadata */}
                <div className="p-2.5 flex flex-col gap-0.5 border-t border-border bg-surface">
                  <span className="text-xs text-foreground font-mono truncate font-medium" title={img.name}>
                    {img.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {img.sizeFormatted}
                  </span>
                </div>
              </div>
            ))}

            {/* Add More Thumbnail Trigger (if under max) */}
            {!isMaxReached && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square border border-dashed border-border hover:border-accent bg-surface hover:bg-accent-subtle/30 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-accent transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                aria-label="Add another reference image"
              >
                <Plus className="h-5 w-5" />
                <span className="text-[10px] uppercase tracking-wider font-mono">
                  Add More
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
