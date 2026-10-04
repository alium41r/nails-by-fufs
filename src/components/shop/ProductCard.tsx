import React from "react";
import Link from "next/link";
import { ImagePlaceholder } from "@/components/media/ImagePlaceholder";
import type { CatalogueProduct } from "@/lib/catalogue";
import { cn } from "@/lib/utils";

export interface ProductCardProps {
  product: CatalogueProduct;
  className?: string;
  priority?: boolean;
}

export function ProductCard({ product, className }: ProductCardProps) {
  return (
    <Link
      href={`/product/${product.slug}`}
      className={cn(
        "group flex flex-col gap-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded-xs select-none",
        className
      )}
      aria-label={`${product.name} — ${product.descriptor} — ${product.price}`}
    >
      {/* 4:5 Editorial Image Frame */}
      <div className="relative w-full overflow-hidden bg-surface-subtle">
        <ImagePlaceholder
          ratio="portrait"
          src={product.images[0]?.url ?? null}
          label={product.imagePlaceholder.label}
          sublabel={product.imagePlaceholder.sublabel}
          interactive
          className="w-full shadow-xs"
        />

        {product.tag && (
          <span className="absolute top-2.5 right-2.5 text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 bg-surface/95 text-foreground border border-border/80 shadow-xs z-10">
            {product.tag}
          </span>
        )}
      </div>

      {/* Restrained Editorial Typography & Metadata */}
      <div className="flex flex-col gap-1 px-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-display text-base sm:text-lg text-foreground font-normal tracking-wide group-hover:text-accent transition-colors truncate">
            {product.name}
          </h3>
          <span className="text-xs font-mono text-muted-foreground shrink-0 font-medium">
            {product.price}
          </span>
        </div>
        <p className="text-[11px] sm:text-xs text-muted-foreground font-sans truncate">
          {product.descriptor}
        </p>
      </div>
    </Link>
  );
}
