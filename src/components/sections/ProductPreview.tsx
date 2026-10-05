import React from "react";
import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { ImagePlaceholder } from "@/components/media/ImagePlaceholder";
import { StudioContent } from "@/components/studio/StudioContent";
import type { CatalogueProduct } from "@/lib/catalogue";
import type { ProductPreviewContent } from "@/lib/site-content-schema";
import { ArrowRight } from "lucide-react";

/**
 * The homepage product preview grid.
 *
 * This section previously had no content source at all: its eyebrow, heading, the
 * "View All Nails" label (twice, as two independent literals) and all three
 * `/shop` destinations were inline in JSX. They now come from the
 * `home.productPreview` document.
 *
 * `productLimit` replaces the hardcoded `.slice(0, 4)`, and `cardHref` is kept
 * separate from `viewAllHref` even though both are `/shop` today — they are
 * different decisions, and folding them into one field would remove the ability
 * to point cards at a product page later without a code change.
 *
 * The products themselves still come from the catalogue; this section chooses
 * how many to show and what to call the section, and nothing else.
 */
export function ProductPreview({
  products,
  content,
}: {
  products: CatalogueProduct[];
  content: ProductPreviewContent;
}) {
  return (
    <section
      className="py-14 sm:py-20 lg:py-24 border-b border-border bg-background"
      aria-labelledby="shop-preview-heading"
    >
      <Container size="wide">
        <div className="flex flex-col gap-10 lg:gap-14">
          {/* Section Header */}
          <div className="flex items-end justify-between gap-4">
            <div className="flex flex-col gap-2">
              <StudioContent
                target={{ key: "home.productPreview", field: "eyebrow", label: "Eyebrow" }}
                className="eyebrow text-accent tracking-[0.2em]"
              >
                {content.eyebrow}
              </StudioContent>
              <h2
                id="shop-preview-heading"
                className="font-display font-light text-3xl sm:text-4xl text-foreground tracking-tight text-balance"
              >
                <StudioContent
                  target={{ key: "home.productPreview", field: "title", label: "Title" }}
                >
                  {content.title}
                </StudioContent>
              </h2>
            </div>

            <StudioContent
              as="div"
              target={{
                key: "home.productPreview",
                field: "viewAllLabel",
                label: "View-all link",
              }}
            >
              <Link
                href={content.viewAllHref}
                className="hidden sm:inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-foreground hover:text-accent transition-colors group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent py-1"
              >
                <span>{content.viewAllLabel}</span>
                <ArrowRight className="h-3.5 w-3.5 text-accent transition-transform duration-150 group-hover:translate-x-1" />
              </Link>
            </StudioContent>
          </div>

          {/* Product Grid: 2 columns mobile, 4 columns desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {products.slice(0, content.productLimit).map((product) => (
              <Link
                key={product.id}
                href={content.cardHref}
                className="group flex flex-col gap-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded-xs"
                aria-label={`${product.name} - ${product.descriptor} - ${product.price}`}
              >
                {/* Dominant 4:5 Product Photography Placeholder */}
                <div className="relative w-full overflow-hidden">
                  <ImagePlaceholder
                    ratio="portrait"
                    src={product.images[0]?.url ?? null}
                    label={product.imagePlaceholder.label}
                    sublabel={product.imagePlaceholder.sublabel}
                    interactive
                    className="w-full shadow-xs"
                  />
                  {product.tag && (
                    <span className="absolute top-2.5 right-2.5 text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 bg-surface/95 text-foreground border border-border/80 shadow-xs">
                      {product.tag}
                    </span>
                  )}
                </div>

                {/* Restrained Metadata */}
                <div className="flex flex-col gap-1 px-0.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-display text-base sm:text-lg text-foreground font-normal tracking-wide group-hover:text-accent transition-colors truncate">
                      {product.name}
                    </h3>
                    <span className="text-xs font-mono text-muted-foreground shrink-0">
                      {product.price}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-muted-foreground font-sans truncate">
                    {product.descriptor}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* Mobile "View All" CTA Link */}
          <div className="sm:hidden text-center pt-2">
            <Link
              href={content.viewAllHref}
              className="inline-flex items-center justify-center gap-2 text-xs uppercase tracking-[0.16em] text-foreground hover:text-accent transition-colors py-3 w-full border border-border bg-surface-subtle/50 active:bg-surface min-h-[44px]"
            >
              <span>{content.viewAllLabel}</span>
              <ArrowRight className="h-3.5 w-3.5 text-accent" />
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
