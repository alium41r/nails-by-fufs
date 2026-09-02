import React from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { ImagePlaceholder } from "@/components/media/ImagePlaceholder";
import { featuredCollectionContent } from "@/data/homepage";
import { ArrowRight } from "lucide-react";

export function FeaturedCollection() {
  return (
    <section
      className="py-14 sm:py-20 lg:py-24 border-b border-border bg-surface-subtle/40"
      aria-labelledby="featured-collection-heading"
    >
      <Container size="wide">
        <div className="flex flex-col gap-8 lg:gap-12">
          {/* Header Row: Title & Concise Lookbook Narrative */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/70">
            <div className="flex flex-col gap-2 max-w-xl">
              <span className="eyebrow text-accent tracking-[0.2em]">
                {featuredCollectionContent.eyebrow}
              </span>
              <h2
                id="featured-collection-heading"
                className="font-display font-light text-3xl sm:text-4xl lg:text-5xl text-foreground tracking-tight text-balance"
              >
                {featuredCollectionContent.title}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed font-sans">
              {featuredCollectionContent.description}
            </p>
          </div>

          {/* Large Editorial Lookbook Visual */}
          <div className="relative w-full">
            <Link
              href={featuredCollectionContent.cta.href}
              className="group block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              aria-label={`${featuredCollectionContent.title} — ${featuredCollectionContent.cta.label}`}
            >
              <ImagePlaceholder
                ratio="wide"
                label={featuredCollectionContent.imagePlaceholder.label}
                sublabel={featuredCollectionContent.imagePlaceholder.sublabel}
                interactive
                className="w-full max-h-[520px] shadow-xs"
              />

              {/* Action Bar Beneath Visual */}
              <div className="flex items-center justify-between pt-4 px-1">
                <span className="text-xs uppercase tracking-[0.18em] font-medium text-foreground group-hover:text-accent transition-colors">
                  {featuredCollectionContent.cta.label}
                </span>
                <div className="inline-flex items-center gap-1 text-accent text-xs tracking-wider">
                  <span className="hidden sm:inline text-[11px] uppercase tracking-[0.14em] opacity-0 group-hover:opacity-100 transition-opacity">
                    View Lookbook
                  </span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
