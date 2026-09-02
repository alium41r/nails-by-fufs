import React from "react";
import type { Metadata } from "next";
import { Shell } from "@/components/layout/Shell";
import { Container } from "@/components/layout/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { ImagePlaceholder } from "@/components/media/ImagePlaceholder";
import {
  aboutHero,
  aboutStory,
  aboutPhilosophy,
  studioVisual,
  aboutCta,
} from "@/data/about";
import { Sparkles, Heart } from "lucide-react";

export const metadata: Metadata = {
  title: "About the Studio — Nails by Fufs",
  description:
    "Meet Fatima, the independent nail artist behind Nails by Fufs, and explore the craftsmanship and philosophy behind each handcrafted set.",
};

export default function AboutPage() {
  return (
    <Shell>
      <div className="py-10 sm:py-14 lg:py-20 bg-background">
        <Container size="wide">
          <div className="flex flex-col gap-16 sm:gap-24 lg:gap-32">
            {/* ─────────────────────────────────────────────────────────────
                01. BREADCRUMBS & ASYMMETRICAL EDITORIAL HERO
            ───────────────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-8">
              <Breadcrumbs
                items={[
                  { label: "Home", href: "/" },
                  { label: "About Studio" },
                ]}
              />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 sm:gap-12 lg:gap-16 items-center pt-2">
                {/* Hero Copy (Left 6 Cols) */}
                <div className="lg:col-span-6 flex flex-col justify-center gap-5">
                  <span className="eyebrow text-accent tracking-[0.2em]">
                    {aboutHero.eyebrow}
                  </span>

                  <h1 className="font-display font-light text-4xl sm:text-5xl lg:text-6xl text-foreground tracking-tight leading-tight text-balance">
                    {aboutHero.title}
                  </h1>

                  <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-sans max-w-lg">
                    {aboutHero.description}
                  </p>

                  <div className="pt-2">
                    <Button href="/custom" variant="outline" size="md">
                      Commission a Set
                    </Button>
                  </div>
                </div>

                {/* Hero Artist Visual (Right 6 Cols) */}
                <div className="lg:col-span-6">
                  <div className="relative w-full overflow-hidden bg-surface-subtle border border-border">
                    <ImagePlaceholder
                      ratio="portrait"
                      label={aboutHero.imagePlaceholder.label}
                      sublabel={aboutHero.imagePlaceholder.sublabel}
                      interactive
                      className="w-full max-h-[520px] shadow-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                02. THE STUDIO STORY (Airy Split Layout)
            ───────────────────────────────────────────────────────────── */}
            <div className="border-t border-border pt-12 sm:pt-16">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
                <div className="lg:col-span-5 flex flex-col gap-3">
                  <div className="inline-flex items-center gap-1.5 text-accent text-xs">
                    <Heart className="h-3.5 w-3.5" />
                    <span className="eyebrow text-accent">{aboutStory.eyebrow}</span>
                  </div>
                  <h2 className="font-display font-light text-3xl sm:text-4xl text-foreground tracking-tight text-balance">
                    {aboutStory.title}
                  </h2>
                </div>

                <div className="lg:col-span-7 flex flex-col gap-5 text-sm sm:text-base text-muted-foreground leading-relaxed font-sans">
                  {aboutStory.paragraphs.map((p, idx) => (
                    <p key={idx}>{p}</p>
                  ))}
                </div>
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                03. STUDIO WORKSPACE LOOKBOOK BANNER
            ───────────────────────────────────────────────────────────── */}
            <div className="relative w-full overflow-hidden bg-surface-subtle border border-border">
              <ImagePlaceholder
                ratio="wide"
                label={studioVisual.label}
                sublabel={studioVisual.sublabel}
                className="w-full max-h-[480px] shadow-xs"
              />
            </div>

            {/* ─────────────────────────────────────────────────────────────
                04. PHILOSOPHY & VALUES (3-Column Minimalist Strip)
            ───────────────────────────────────────────────────────────── */}
            <div className="border border-border bg-surface-subtle/30 p-8 sm:p-12 lg:p-14 flex flex-col gap-8">
              <div className="flex flex-col gap-1 max-w-xl">
                <div className="inline-flex items-center gap-1.5 text-accent text-xs">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="eyebrow text-accent">Our Pillars</span>
                </div>
                <h3 className="font-display font-light text-2xl sm:text-3xl text-foreground">
                  The Studio Standard
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 border-t border-border/80 pt-6">
                {aboutPhilosophy.map((point, index) => (
                  <div key={index} className="flex flex-col gap-2">
                    <span className="text-xs uppercase tracking-[0.14em] font-medium text-foreground font-sans">
                      {point.title}
                    </span>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-sans">
                      {point.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                05. CLOSING CTA
            ───────────────────────────────────────────────────────────── */}
            <div className="text-center flex flex-col items-center gap-5 max-w-xl mx-auto py-8">
              <span className="eyebrow text-accent tracking-[0.2em]">
                {aboutCta.eyebrow}
              </span>

              <h2 className="font-display font-light text-3xl sm:text-4xl lg:text-5xl text-foreground tracking-tight text-balance">
                {aboutCta.title}
              </h2>

              <p className="text-sm text-muted-foreground leading-relaxed font-sans max-w-md -mt-1">
                {aboutCta.description}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-3 w-full max-w-xs sm:max-w-none">
                <Button
                  href={aboutCta.primaryCta.href}
                  variant="primary"
                  size="md"
                  className="w-full sm:w-auto sm:px-8"
                >
                  {aboutCta.primaryCta.label}
                </Button>

                <Button
                  href={aboutCta.secondaryCta.href}
                  variant="outline"
                  size="md"
                  className="w-full sm:w-auto sm:px-8"
                >
                  {aboutCta.secondaryCta.label}
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </div>
    </Shell>
  );
}
