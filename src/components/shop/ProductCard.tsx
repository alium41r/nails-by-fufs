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

/**
 * Product cards opt out of `<Link>`'s automatic prefetch.
 *
 * ## Why this is not just a preference
 *
 * A product detail route is dynamic, so with the default `prefetch="auto"` the
 * router can only fetch the route's static App Shell — down to the nearest
 * `loading.js`. It cannot fetch the product content itself. The click therefore
 * still performs its own full RSC request, and the prefetch is pure overhead.
 *
 * That overhead was previously severe: the navigation latency audit measured
 * nine product prefetches firing the moment `/shop` rendered, each costing a
 * full server render (400–1276 ms, three database queries against another
 * region) for a response containing no page content. Those concurrent renders
 * saturated the Prisma connection pool and degraded real navigations.
 *
 * The catalogue cache and the `loading.tsx` boundary have since removed that
 * cost — a prefetch is now ~15–25 ms and the boundary paints immediately — but
 * the requests still buy nothing, so a grid of products would keep firing one
 * useless server render per card on every catalogue page.
 *
 * ## Why this is safe
 *
 * The remaining navigation cost is a single RSC request for the destination,
 * which is served from the cached catalogue in ~11 ms, and the route paints its
 * `loading.tsx` boundary the instant the link is clicked. Prefetching is left
 * enabled everywhere else — this is scoped to product cards, not disabled
 * globally.
 */
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
        prefetch={false}
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
