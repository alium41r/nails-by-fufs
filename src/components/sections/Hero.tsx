import React from "react";

import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { ImagePlaceholder } from "@/components/media/ImagePlaceholder";
import { StudioContent } from "@/components/studio/StudioContent";
import { StudioImageControl } from "@/components/studio/StudioImageSlot";
import { studioImageGroupClass } from "@/lib/studio/image-slot-class";
import { siteAssetUrl } from "@/lib/site-content";
import type { HeroContent } from "@/lib/site-content-schema";

/**
 * The homepage hero.
 *
 * Every string here is owner-managed and comes from the `home.hero` content
 * document; only the layout, typography and the structure of the two calls to
 * action remain in code. `headline` and `headlineAccent` are still two fields
 * because the accent is rendered in italic serif inside the same `<h1>`, and the
 * literal space between them is what produces "Press-ons, made personal." — it
 * is preserved exactly.
 */
export async function Hero({ content }: { content: HeroContent }) {
  const studioGroup = await studioImageGroupClass();
  return (
    <section
      className="relative overflow-hidden pt-8 pb-14 sm:pt-12 sm:pb-20 lg:pt-16 lg:pb-24 border-b border-border bg-background"
      aria-label="Introduction"
    >
      <Container size="wide">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 sm:gap-12 lg:gap-14 xl:gap-20 items-center">
          {/* Editorial Headline & Story Column */}
          <div className="lg:col-span-6 flex flex-col justify-center order-2 lg:order-1">
            <div className="flex flex-col gap-5 max-w-xl">
              {/* Eyebrow */}
              <div>
                <StudioContent
                  target={{ key: "home.hero", field: "eyebrow", label: "Hero eyebrow" }}
                  className="eyebrow text-accent tracking-[0.2em]"
                >
                  {content.eyebrow}
                </StudioContent>
              </div>

              {/* Editorial Display Headline */}
              <h1 className="font-display font-light text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-6xl text-foreground tracking-tight leading-[1.08] text-balance">
                <StudioContent
                  target={{ key: "home.hero", field: "headline", label: "Headline" }}
                >
                  {content.headline}
                </StudioContent>{" "}
                <StudioContent
                  target={{ key: "home.hero", field: "headlineAccent", label: "Accent" }}
                  className="italic font-normal text-accent block sm:inline"
                >
                  {content.headlineAccent}
                </StudioContent>
              </h1>

              {/* Sub-headline description */}
              <StudioContent
                as="div"
                target={{ key: "home.hero", field: "description", label: "Hero description" }}
                className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-lg font-sans"
              >
                {content.description}
              </StudioContent>

              {/* Call-to-Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-3 sm:pt-5">
                <StudioContent
                  as="div"
                  target={{ key: "home.hero", field: "primaryCta", label: "Primary CTA" }}
                >
                  <Button
                    href={content.primaryCta.href}
                    variant="primary"
                    size="md"
                    className="sm:px-8 shadow-xs"
                  >
                    {content.primaryCta.label}
                  </Button>
                </StudioContent>

                <StudioContent
                  as="div"
                  target={{ key: "home.hero", field: "secondaryCta", label: "Secondary CTA" }}
                >
                  <Button
                    href={content.secondaryCta.href}
                    variant="outline"
                    size="md"
                    className="sm:px-8"
                  >
                    {content.secondaryCta.label}
                  </Button>
                </StudioContent>
              </div>
            </div>
          </div>

          {/* Dominant 4:5 Editorial Photography Column */}
          <div className="lg:col-span-6 order-1 lg:order-2">
            <div className={`relative mx-auto w-full max-w-md lg:max-w-none ${studioGroup}`}>
              <ImagePlaceholder
                ratio={content.imageRatio}
                src={siteAssetUrl(content.imagePath)}
                alt={content.imageAlt}
                label={content.imagePlaceholderLabel}
                sublabel={content.imagePlaceholderSublabel}
                interactive
                className="w-full shadow-xs"
              />
              <StudioImageControl contentKey="home.hero" label="hero image" />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
