import React from "react";

import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { ImagePlaceholder } from "@/components/media/ImagePlaceholder";
import { StudioContent } from "@/components/studio/StudioContent";
import { StudioImageControl } from "@/components/studio/StudioImageSlot";
import { studioImageGroupClass } from "@/lib/studio/image-slot-class";
import type { CustomFeatureContent } from "@/lib/site-content-schema";

/** The bespoke-commission band. Copy and imagery are both owner-managed. */
export async function CustomFeature({ content }: { content: CustomFeatureContent }) {
  const studioGroup = await studioImageGroupClass();
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
              <StudioContent
                target={{ key: "home.customFeature", field: "eyebrow", label: "Eyebrow" }}
                className="eyebrow text-accent tracking-[0.2em]"
              >
                {content.eyebrow}
              </StudioContent>

              <h2
                id="custom-feature-heading"
                className="font-display font-light text-3xl sm:text-4xl lg:text-5xl text-foreground tracking-tight leading-tight text-balance"
              >
                <StudioContent
                  target={{ key: "home.customFeature", field: "title", label: "Title" }}
                >
                  {content.title}
                </StudioContent>
              </h2>

              <StudioContent
                as="div"
                target={{ key: "home.customFeature", field: "description", label: "Description" }}
                className="text-sm text-muted-foreground leading-relaxed font-sans"
              >
                {content.description}
              </StudioContent>

              <div className="pt-2 sm:pt-4">
                <StudioContent
                  as="div"
                  target={{ key: "home.customFeature", field: "cta", label: "Call to action" }}
                >
                  <Button href={content.cta.href} variant="outline" size="md" className="sm:px-8">
                    {content.cta.label}
                  </Button>
                </StudioContent>
              </div>
            </div>
          </div>

          {/* Bespoke Visual Showcase (Right on Desktop, Top on Mobile) */}
          <div className="lg:col-span-7 order-1 lg:order-2">
            <div className={`relative w-full overflow-hidden ${studioGroup}`}>
              <ImagePlaceholder
                ratio={content.imageRatio}
                src={content.imagePath ?? null}
                label={content.imagePlaceholderLabel}
                sublabel={content.imagePlaceholderSublabel}
                interactive
                className="w-full max-h-[480px] shadow-xs"
              />
              <StudioImageControl contentKey="home.customFeature" label="bespoke image" />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
