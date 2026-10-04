"use client";

import React from "react";
import Link from "next/link";
import { ImagePlaceholder } from "@/components/media/ImagePlaceholder";
import type { CatalogueProduct } from "@/lib/catalogue";
import { useStudioProduct } from "@/lib/studio/hooks";
import { StudioCardFrame } from "@/components/studio/StudioCardFrame";
import { cn } from "@/lib/utils";

export interface ProductCardProps {
  product: CatalogueProduct;
  className?: string;
  priority?: boolean;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const merged = useStudioProduct(product);

  const hasImage = Boolean(merged.images[0]?.url);
  const isMissingImage = !hasImage;

  return (
    <StudioCardFrame
      entityType="product"
      id={merged.id}
      name={merged.name}
      isUnpriced={merged.isUnpriced}
      isMissingImage={isMissingImage}
      isActive={merged.isActive}
      featured={merged.featured}
      className={className}
    >
      <Link
        href={`/product/${merged.slug}`}
        className={cn(
          "group flex flex-col gap-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded-xs select-none w-full"
        )}
        aria-label={`${merged.name} — ${merged.descriptor} — ${merged.price}`}
      >
        {/* 4:5 Editorial Image Frame */}
        <div className="relative w-full overflow-hidden bg-surface-subtle">
          <ImagePlaceholder
            ratio="portrait"
            src={merged.images[0]?.url ?? null}
            label={merged.imagePlaceholder.label}
            sublabel={merged.imagePlaceholder.sublabel}
            interactive
            className="w-full shadow-xs"
          />

          {merged.tag && (
            <span className="absolute top-2.5 right-2.5 text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 bg-surface/95 text-foreground border border-border/80 shadow-xs z-10 font-mono">
              {merged.tag}
            </span>
          )}
        </div>

        {/* Restrained Editorial Typography & Metadata */}
        <div className="flex flex-col gap-1 px-0.5">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-display text-base sm:text-lg text-foreground font-normal tracking-wide group-hover:text-accent transition-colors truncate">
              {merged.name}
            </h3>
            <span className="text-xs font-mono text-muted-foreground shrink-0 font-medium">
              {merged.price}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-muted-foreground font-sans truncate">
            {merged.descriptor}
          </p>
        </div>
      </Link>
    </StudioCardFrame>
  );
}
