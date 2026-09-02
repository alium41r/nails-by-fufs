import React from "react";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { ImagePlaceholder } from "@/components/media/ImagePlaceholder";
import { customFeatureContent } from "@/data/homepage";

export function CustomFeature() {
  return (
    <section
      className="py-16 sm:py-24 lg:py-28 border-b border-border bg-background"
      aria-labelledby="custom-feature-heading"
    >
      <Container size="wide">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 sm:gap-12 lg:gap-16 items-center">
          {/* Copy Column (Left on Desktop, Below Visual on Mobile) */}
          <div className="lg:col-span-5 flex flex-col justify-center order-2 lg:order-1">
            <div className="flex flex-col gap-5 max-w-md">
              <span className="eyebrow text-accent tracking-[0.2em]">
                {customFeatureContent.eyebrow}
              </span>

              <h2
                id="custom-feature-heading"
                className="font-display font-light text-3xl sm:text-4xl lg:text-5xl text-foreground tracking-tight leading-tight text-balance"
              >
                {customFeatureContent.title}
              </h2>

              <p className="text-sm text-muted-foreground leading-relaxed font-sans">
                {customFeatureContent.description}
              </p>

              <div className="pt-2 sm:pt-4">
                <Button
                  href={customFeatureContent.cta.href}
                  variant="outline"
                  size="md"
                  className="sm:px-8"
                >
                  {customFeatureContent.cta.label}
                </Button>
              </div>
            </div>
          </div>

          {/* Bespoke Visual Showcase (Right on Desktop, Top on Mobile) */}
          <div className="lg:col-span-7 order-1 lg:order-2">
            <div className="relative w-full overflow-hidden">
              <ImagePlaceholder
                ratio="classic"
                label={customFeatureContent.imagePlaceholder.label}
                sublabel={customFeatureContent.imagePlaceholder.sublabel}
                interactive
                className="w-full max-h-[480px] shadow-xs"
              />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
