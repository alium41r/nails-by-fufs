"use client";

import React, { useState } from "react";
import type { CatalogueImage, CatalogueProduct } from "@/lib/catalogue";
import { ImagePlaceholder } from "@/components/media/ImagePlaceholder";
import { useStudio, useStudioImages } from "@/lib/studio/hooks";
import { cn } from "@/lib/utils";
import { Camera, Plus } from "lucide-react";

export interface ProductGalleryProps {
  images: CatalogueImage[];
  productName: string;
  productId?: string;
}

export function ProductGallery({ images: initialImages, productName, productId }: ProductGalleryProps) {
  const { isEditing, openImageManager } = useStudio();

  // Synthetic stub to hook into studio drafts if productId is supplied
  const productStub = React.useMemo(() => {
    return {
      id: productId || "",
      name: productName,
      images: initialImages,
    } as unknown as CatalogueProduct;
  }, [productId, productName, initialImages]);

  const { catalogueImages } = useStudioImages(productStub);
  const images = productId ? catalogueImages : initialImages;

  const [activeIndex, setActiveIndex] = useState(0);
  const safeActiveIndex = Math.min(activeIndex, Math.max(0, images.length - 1));

  /**
   * A gallery always renders at least the "awaiting photography" placeholder,
   * so this fallback only exists to keep the component from dereferencing
   * `undefined` if a caller ever passes an empty list.
   */
  const activeImage =
    images[safeActiveIndex] ||
    images[0] || {
      id: `placeholder-${productName}`,
      label: productName,
      sublabel: "4:5 • PRODUCT SHOT",
      alt: `${productName} press-on nail set`,
      ratio: "portrait" as const,
      url: null,
    };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Primary Display View */}
      <div className="relative w-full overflow-hidden bg-surface-subtle group/gallery">
        <ImagePlaceholder
          ratio={activeImage.ratio || "portrait"}
          src={activeImage.url ?? null}
          label={activeImage.label}
          sublabel={activeImage.sublabel}
          className="w-full shadow-xs transition-all duration-300"
          aria-label={`${productName} — ${activeImage.alt}`}
        />

        {/* Studio Mode: Manage Photos Overlay Button */}
        {isEditing && productId && (
          <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
            <button
              type="button"
              onClick={() => openImageManager(productId)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider bg-stone-950/90 text-stone-100 hover:bg-accent hover:text-accent-foreground border border-stone-700/80 shadow-md backdrop-blur-xs rounded-xs transition-colors cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-accent group-hover/gallery:text-inherit" />
              <span>Manage Photos ({images.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* Multi-Angle Thumbnails */}
      {(images.length > 1 || (isEditing && productId)) && (
        <div
          className="grid grid-cols-4 sm:grid-cols-5 gap-2.5 sm:gap-3"
          role="tablist"
          aria-label="Product image thumbnails"
        >
          {images.map((image, idx) => {
            const isSelected = idx === safeActiveIndex;
            return (
              <div key={image.id} className="relative group/thumb">
                <button
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-label={`View ${image.label}`}
                  onClick={() => setActiveIndex(idx)}
                  className={cn(
                    "w-full relative overflow-hidden border transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent cursor-pointer",
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
              </div>
            );
          })}

          {/* Studio Mode: Quick Add Photo Tile */}
          {isEditing && productId && (
            <button
              type="button"
              onClick={() => openImageManager(productId)}
              className="aspect-square border border-dashed border-accent/50 hover:border-accent hover:bg-accent/5 flex flex-col items-center justify-center gap-1 text-accent transition-colors rounded-xs cursor-pointer p-2 text-center"
              title="Add product photo"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[9px] font-mono uppercase tracking-wider">Add</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

