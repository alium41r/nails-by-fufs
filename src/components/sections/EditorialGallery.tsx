import React from "react";

import { Container } from "@/components/layout/Container";
import { ImagePlaceholder } from "@/components/media/ImagePlaceholder";
import { StudioContent } from "@/components/studio/StudioContent";
import { StudioImageControl } from "@/components/studio/StudioImageSlot";
import { studioImageGroupClass } from "@/lib/studio/image-slot-class";
import type { GalleryContent } from "@/lib/site-content-schema";

/**
 * The editorial lookbook grid.
 *
 * This section's entire header used to be inline JSX — eyebrow, heading and
 * description were literals in the component, and the four tiles passed no `src`
 * at all, so they could only ever show a placeholder frame. All of it is now the
 * `home.gallery` document, and each tile accepts an uploaded image.
 *
 * A tile's `key` is a stable identity independent of its label, so reordering or
 * renaming a tile does not remount it or collide as a React key.
 */
export async function EditorialGallery({ content }: { content: GalleryContent }) {
  const studioGroup = await studioImageGroupClass();
  return (
    <section
      className="py-16 sm:py-24 lg:py-28 border-b border-border bg-background"
      aria-labelledby="gallery-heading"
    >
      <Container size="wide">
        <div className="flex flex-col gap-8 sm:gap-12">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/70">
            <div className="flex flex-col gap-2 max-w-xl">
              <StudioContent
                target={{ key: "home.gallery", field: "eyebrow", label: "Eyebrow" }}
                className="eyebrow text-accent tracking-[0.2em]"
              >
                {content.eyebrow}
              </StudioContent>
              <h2
                id="gallery-heading"
                className="font-display font-light text-3xl sm:text-4xl lg:text-5xl text-foreground tracking-tight text-balance"
              >
                <StudioContent
                  target={{ key: "home.gallery", field: "title", label: "Title" }}
                >
                  {content.title}
                </StudioContent>
              </h2>
            </div>
            <StudioContent
              as="div"
              target={{ key: "home.gallery", field: "description", label: "Description" }}
              className="text-sm text-muted-foreground max-w-md font-sans leading-relaxed"
            >
              {content.description}
            </StudioContent>
          </div>

          {/* Editorial Gallery Grid: 2 columns on mobile, 4 columns on desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {content.items.map((item, index) => (
              <div
                key={item.key}
                className={`relative overflow-hidden w-full ${studioGroup}`}
              >
                <ImagePlaceholder
                  ratio={item.ratio}
                  src={item.imagePath ?? null}
                  label={item.label}
                  sublabel={item.sublabel}
                  interactive
                  className="w-full shadow-xs"
                />
                <StudioImageControl
                  contentKey="home.gallery"
                  label={`tile ${index + 1}`}
                  pathField={`items.${index}.imagePath`}
                />
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
