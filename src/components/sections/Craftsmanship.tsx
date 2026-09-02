import React from "react";
import { Container } from "@/components/layout/Container";
import { ImagePlaceholder } from "@/components/media/ImagePlaceholder";
import { craftsmanshipContent } from "@/data/homepage";

export function Craftsmanship() {
  return (
    <section className="py-16 sm:py-24 border-b border-border bg-surface-subtle/20">
      <Container size="wide">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* Visual Column */}
          <div className="lg:col-span-6">
            <ImagePlaceholder
              ratio="portrait"
              label={craftsmanshipContent.imagePlaceholder.label}
              sublabel={craftsmanshipContent.imagePlaceholder.sublabel}
              interactive
              className="w-full max-h-[500px]"
            />
          </div>

          {/* Copy Column */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            <div className="flex flex-col gap-5 max-w-lg">
              <span className="eyebrow text-accent">
                {craftsmanshipContent.eyebrow}
              </span>

              <h2 className="font-display font-light text-2xl sm:text-4xl text-foreground tracking-tight leading-snug">
                {craftsmanshipContent.title}
              </h2>

              <div className="flex flex-col gap-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {craftsmanshipContent.paragraphs.map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
              </div>

              {/* Supporting Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border/80">
                {craftsmanshipContent.details.map((detail, idx) => (
                  <div key={idx} className="flex flex-col gap-1">
                    <span className="text-[11px] uppercase tracking-[0.14em] font-medium text-foreground">
                      {detail.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {detail.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
