import React from "react";
import { Container } from "@/components/layout/Container";
import { ImagePlaceholder } from "@/components/media/ImagePlaceholder";
import { galleryItems } from "@/data/homepage";

export function EditorialGallery() {
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
              <span className="eyebrow text-accent tracking-[0.2em]">Visual Archive</span>
              <h2
                id="gallery-heading"
                className="font-display font-light text-3xl sm:text-4xl lg:text-5xl text-foreground tracking-tight text-balance"
              >
                Selected Looks
              </h2>
            </div>
            <p className="text-sm text-muted-foreground max-w-md font-sans leading-relaxed">
              A curated lookbook of finishes, textures, and custom pieces.
            </p>
          </div>

          {/* Editorial Gallery Grid: 2 columns on mobile, 4 columns on desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {galleryItems.map((item) => (
              <div key={item.id} className="relative overflow-hidden w-full">
                <ImagePlaceholder
                  ratio={item.ratio}
                  label={item.label}
                  sublabel={item.sublabel}
                  interactive
                  className="w-full shadow-xs"
                />
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
