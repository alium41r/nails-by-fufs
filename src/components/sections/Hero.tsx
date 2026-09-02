import React from "react";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { ImagePlaceholder } from "@/components/media/ImagePlaceholder";
import { heroContent } from "@/data/homepage";

export function Hero() {
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
                <span className="eyebrow text-accent tracking-[0.2em]">
                  {heroContent.eyebrow}
                </span>
              </div>

              {/* Editorial Display Headline */}
              <h1 className="font-display font-light text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-6xl text-foreground tracking-tight leading-[1.08] text-balance">
                {heroContent.headline}{" "}
                <span className="italic font-normal text-accent block sm:inline">
                  {heroContent.headlineAccent}
                </span>
              </h1>

              {/* Sub-headline description */}
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-lg font-sans">
                {heroContent.description}
              </p>

              {/* Call-to-Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-3 sm:pt-5">
                <Button
                  href={heroContent.primaryCta.href}
                  variant="primary"
                  size="md"
                  className="sm:px-8 shadow-xs"
                >
                  {heroContent.primaryCta.label}
                </Button>

                <Button
                  href={heroContent.secondaryCta.href}
                  variant="outline"
                  size="md"
                  className="sm:px-8"
                >
                  {heroContent.secondaryCta.label}
                </Button>
              </div>
            </div>
          </div>

          {/* Dominant 4:5 Editorial Photography Column */}
          <div className="lg:col-span-6 order-1 lg:order-2">
            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <ImagePlaceholder
                ratio="portrait"
                label={heroContent.imagePlaceholder.label}
                sublabel={heroContent.imagePlaceholder.sublabel}
                interactive
                className="w-full shadow-xs"
              />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
