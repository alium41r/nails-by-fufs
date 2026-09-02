import React from "react";
import type { Metadata } from "next";
import { Shell } from "@/components/layout/Shell";
import { Container } from "@/components/layout/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { ImagePlaceholder } from "@/components/media/ImagePlaceholder";
import {
  howItWorksHero,
  processStepsData,
  careNotesData,
  howItWorksCta,
} from "@/data/how-it-works";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "How It Works — Nails by Fufs",
  description:
    "A simple visual guide to sizing, applying, and caring for your handcrafted press-on nails from Nails by Fufs.",
};

export default function HowItWorksPage() {
  return (
    <Shell>
      <div className="py-10 sm:py-14 lg:py-20 bg-background">
        <Container size="wide">
          <div className="flex flex-col gap-14 sm:gap-20 lg:gap-28">
            {/* ─────────────────────────────────────────────────────────────
                01. HEADER & HERO
            ───────────────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-8">
              <Breadcrumbs
                items={[
                  { label: "Home", href: "/" },
                  { label: "How It Works" },
                ]}
              />

              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-2">
                <div className="flex flex-col gap-2 max-w-xl">
                  <span className="eyebrow text-accent tracking-[0.2em]">
                    {howItWorksHero.eyebrow}
                  </span>
                  <h1 className="font-display font-light text-4xl sm:text-5xl lg:text-6xl text-foreground tracking-tight text-balance">
                    {howItWorksHero.title}
                  </h1>
                </div>
                <p className="text-sm sm:text-base text-muted-foreground max-w-md leading-relaxed font-sans">
                  {howItWorksHero.description}
                </p>
              </div>

              {/* Lookbook Process Banner */}
              <div className="relative w-full overflow-hidden bg-surface-subtle border border-border mt-2">
                <ImagePlaceholder
                  ratio="wide"
                  label={howItWorksHero.imagePlaceholder.label}
                  sublabel={howItWorksHero.imagePlaceholder.sublabel}
                  className="w-full max-h-[460px] shadow-xs"
                />
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                02. FOUR-STEP ASYMMETRIC EDITORIAL PROCESS
            ───────────────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-16 sm:gap-24 lg:gap-32">
              <div className="border-b border-border pb-4 flex items-center justify-between">
                <span className="eyebrow text-accent">The 4-Step Journey</span>
                <span className="text-[11px] font-mono text-muted-foreground">01 — 04</span>
              </div>

              {processStepsData.map((step, idx) => {
                const isEven = idx % 2 === 1;

                return (
                  <div
                    key={step.number}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 lg:gap-16 items-center"
                  >
                    {/* Copy Block */}
                    <div
                      className={cn(
                        "lg:col-span-6 flex flex-col justify-center",
                        isEven ? "lg:order-2" : "lg:order-1"
                      )}
                    >
                      <div className="flex flex-col gap-4 max-w-lg">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs text-accent font-semibold tracking-widest px-2.5 py-1 bg-accent-subtle border border-accent/20">
                            STEP {step.number}
                          </span>
                          <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-mono">
                            {step.subtitle}
                          </span>
                        </div>

                        <h2 className="font-display font-light text-3xl sm:text-4xl lg:text-5xl text-foreground tracking-tight">
                          {step.title}
                        </h2>

                        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-sans">
                          {step.description}
                        </p>

                        <div className="pt-2 border-t border-border/80 flex items-start gap-2 text-xs text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                          <span className="font-sans leading-relaxed">{step.detail}</span>
                        </div>
                      </div>
                    </div>

                    {/* Image Block */}
                    <div
                      className={cn(
                        "lg:col-span-6",
                        isEven ? "lg:order-1" : "lg:order-2"
                      )}
                    >
                      <div className="relative w-full overflow-hidden bg-surface-subtle border border-border">
                        <ImagePlaceholder
                          ratio={step.imagePlaceholder.ratio}
                          label={step.imagePlaceholder.label}
                          sublabel={step.imagePlaceholder.sublabel}
                          interactive
                          className="w-full shadow-xs"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ─────────────────────────────────────────────────────────────
                03. HELPFUL CARE & PREPARATION STRIP
            ───────────────────────────────────────────────────────────── */}
            <div className="border border-border bg-surface-subtle/30 p-8 sm:p-12 lg:p-14 flex flex-col gap-8">
              <div className="flex flex-col gap-2 max-w-xl">
                <div className="inline-flex items-center gap-1.5 text-accent text-xs">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="eyebrow text-accent">Helpful Advice</span>
                </div>
                <h3 className="font-display font-light text-2xl sm:text-3xl text-foreground">
                  Tips for Best Wear
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 border-t border-border/80 pt-6">
                {careNotesData.map((note, index) => (
                  <div key={index} className="flex flex-col gap-2">
                    <span className="text-xs uppercase tracking-[0.14em] font-medium text-foreground">
                      {note.title}
                    </span>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-sans">
                      {note.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                04. CLOSING FOCUSED CTA
            ───────────────────────────────────────────────────────────── */}
            <div className="text-center flex flex-col items-center gap-5 max-w-xl mx-auto py-8">
              <span className="eyebrow text-accent tracking-[0.2em]">
                {howItWorksCta.eyebrow}
              </span>

              <h2 className="font-display font-light text-3xl sm:text-4xl lg:text-5xl text-foreground tracking-tight text-balance">
                {howItWorksCta.title}
              </h2>

              <p className="text-sm text-muted-foreground leading-relaxed font-sans max-w-md -mt-1">
                {howItWorksCta.description}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-3 w-full max-w-xs sm:max-w-none">
                <Button
                  href={howItWorksCta.primaryCta.href}
                  variant="primary"
                  size="md"
                  className="w-full sm:w-auto sm:px-8"
                >
                  {howItWorksCta.primaryCta.label}
                </Button>

                <Button
                  href={howItWorksCta.secondaryCta.href}
                  variant="outline"
                  size="md"
                  className="w-full sm:w-auto sm:px-8"
                >
                  {howItWorksCta.secondaryCta.label}
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </div>
    </Shell>
  );
}
