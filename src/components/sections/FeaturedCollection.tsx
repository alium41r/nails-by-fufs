import React from "react";
import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { ImagePlaceholder } from "@/components/media/ImagePlaceholder";
import { StudioContent } from "@/components/studio/StudioContent";
import { StudioImageControl } from "@/components/studio/StudioImageSlot";
import { studioImageGroupClass } from "@/lib/studio/image-slot-class";
import { siteAssetUrl } from "@/lib/site-content";
import type { FeaturedCollectionContent } from "@/lib/site-content-schema";
import { ArrowRight } from "lucide-react";

/**
 * The featured-collection lookbook band.
 *
 * The one string that lived inline in JSX before — the "View Lookbook" hover
 * hint — is now `hoverHintLabel` in the `home.featuredCollection` document, so it
 * is editable without a deploy. The derived `aria-label` on the wrapping link is
 * still derived from the title and CTA label rather than stored, so it cannot
 * disagree with what is visible.
 */
export async function FeaturedCollection({ content }: { content: FeaturedCollectionContent }) {
  const studioGroup = await studioImageGroupClass();
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
              <StudioContent
                target={{
                  key: "home.featuredCollection",
                  field: "eyebrow",
                  label: "Section eyebrow",
                }}
                className="eyebrow text-accent tracking-[0.2em]"
              >
                {content.eyebrow}
              </StudioContent>
              <h2
                id="featured-collection-heading"
                className="font-display font-light text-3xl sm:text-4xl lg:text-5xl text-foreground tracking-tight text-balance"
              >
                <StudioContent
                  target={{ key: "home.featuredCollection", field: "title", label: "Title" }}
                >
                  {content.title}
                </StudioContent>
              </h2>
            </div>
            <StudioContent
              as="div"
              target={{
                key: "home.featuredCollection",
                field: "description",
                label: "Description",
              }}
              className="text-sm text-muted-foreground max-w-md leading-relaxed font-sans"
            >
              {content.description}
            </StudioContent>
          </div>

          {/* Large Editorial Lookbook Visual */}
          <div className={`relative w-full ${studioGroup}`}>
            <Link
              href={content.cta.href}
              className="group block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              aria-label={`${content.title} — ${content.cta.label}`}
            >
              <ImagePlaceholder
                ratio={content.imageRatio}
                src={siteAssetUrl(content.imagePath)}
                alt={content.imageAlt}
                label={content.imagePlaceholderLabel}
                sublabel={content.imagePlaceholderSublabel}
                interactive
                className="w-full max-h-[520px] shadow-xs"
              />

              {/* Action Bar Beneath Visual */}
              <div className="flex items-center justify-between pt-4 px-1">
                <span className="text-xs uppercase tracking-[0.18em] font-medium text-foreground group-hover:text-accent transition-colors">
                  {content.cta.label}
                </span>
                <div className="inline-flex items-center gap-1 text-accent text-xs tracking-wider">
                  <span className="hidden sm:inline text-[11px] uppercase tracking-[0.14em] opacity-0 group-hover:opacity-100 transition-opacity">
                    {content.hoverHintLabel}
                  </span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
            <StudioImageControl
              contentKey="home.featuredCollection"
              label="lookbook image"
            />
          </div>
        </div>
      </Container>
    </section>
  );
}
