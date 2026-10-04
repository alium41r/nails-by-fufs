"use client";

import React, { useState } from "react";
import type { CatalogueImage } from "@/lib/catalogue";
import { ImagePlaceholder } from "@/components/media/ImagePlaceholder";
import { cn } from "@/lib/utils";

export interface ProductGalleryProps {
  images: CatalogueImage[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = images[activeIndex] || images[0];

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Primary Display View */}
      <div className="relative w-full overflow-hidden bg-surface-subtle">
        <ImagePlaceholder
          ratio={activeImage.ratio || "portrait"}
          label={activeImage.label}
          sublabel={activeImage.sublabel}
          className="w-full shadow-xs transition-all duration-300"
          aria-label={`${productName} — ${activeImage.alt}`}
        />
      </div>

      {/* Multi-Angle Thumbnails (if multiple images exist) */}
      {images.length > 1 && (
        <div
          className="grid grid-cols-4 gap-2.5 sm:gap-3"
          role="tablist"
          aria-label="Product image thumbnails"
        >
          {images.map((image, idx) => {
            const isSelected = idx === activeIndex;
            return (
              <button
                key={image.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={`View ${image.label}`}
                onClick={() => setActiveIndex(idx)}
                className={cn(
                  "relative overflow-hidden border transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent cursor-pointer",
                  isSelected
                    ? "border-accent ring-1 ring-accent"
                    : "border-border hover:border-foreground/40 opacity-70 hover:opacity-100"
                )}
              >
                <div className="aspect-square bg-surface-subtle p-2 flex flex-col items-center justify-center text-center">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground line-clamp-1">
                    0{idx + 1}
                  </span>
                  <span className="text-[10px] font-display text-foreground line-clamp-1">
                    {image.label.split(" ")[0]}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
