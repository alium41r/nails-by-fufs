import React from "react";
import type { Metadata } from "next";
import { Shell } from "@/components/layout/Shell";
import { Container } from "@/components/layout/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { ImagePlaceholder } from "@/components/media/ImagePlaceholder";
import {
  sizeGuideHero,
  measurementSteps,
  fingerLabels,
  standardSizesData,
  shapeGuideData,
  sizeGuideAdvice,
  sizeGuideCta,
} from "@/data/size-guide";
import { Sparkles, HelpCircle, Ruler, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Size & Shape Guide — Nails by Fufs",
  description:
    "Learn how to accurately measure your natural nails for standard preset sizes or custom press-on widths.",
};

export default function SizeGuidePage() {
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
                  { label: "Size Guide" },
                ]}
              />

              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-2">
                <div className="flex flex-col gap-2 max-w-xl">
                  <span className="eyebrow text-accent tracking-[0.2em]">
                    {sizeGuideHero.eyebrow}
                  </span>
                  <h1 className="font-display font-light text-4xl sm:text-5xl lg:text-6xl text-foreground tracking-tight text-balance">
                    {sizeGuideHero.title}
                  </h1>
                </div>
                <p className="text-sm sm:text-base text-muted-foreground max-w-md leading-relaxed font-sans">
                  {sizeGuideHero.description}
                </p>
              </div>

              {/* Lookbook Visual Banner */}
              <div className="relative w-full overflow-hidden bg-surface-subtle border border-border mt-2">
                <ImagePlaceholder
                  ratio="wide"
                  label={sizeGuideHero.imagePlaceholder.label}
                  sublabel={sizeGuideHero.imagePlaceholder.sublabel}
                  className="w-full max-h-[460px] shadow-xs"
                />
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                02. STEP-BY-STEP MEASUREMENT WALKTHROUGH
            ───────────────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-10 sm:gap-14">
              <div className="border-b border-border pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="eyebrow text-accent">Simple Measurement Method</span>
                  <h2 className="font-display font-light text-3xl sm:text-4xl text-foreground tracking-tight">
                    How to Measure at Home
                  </h2>
                </div>
                <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                  <Ruler className="h-3.5 w-3.5 text-accent" />
                  <span>Items needed: Clear tape, pen, millimeter ruler</span>
                </div>
              </div>

              {/* 4 Steps Grid: 2 columns on mobile, 4 columns on desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                {measurementSteps.map((step) => (
                  <div
                    key={step.number}
                    className="flex flex-col gap-4 p-5 sm:p-6 border border-border bg-surface shadow-xs"
                  >
                    <div className="flex items-center justify-between border-b border-border/80 pb-3">
                      <span className="font-mono text-xs font-semibold text-accent px-2 py-0.5 bg-accent-subtle border border-accent/20">
                        {step.number}
                      </span>
                      <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                        {step.title}
                      </span>
                    </div>

                    {/* Step Visual Placeholder */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-subtle border border-border">
                      <ImagePlaceholder
                        ratio="classic"
                        label={step.imagePlaceholder.label}
                        sublabel={step.imagePlaceholder.sublabel}
                        className="w-full h-full"
                      />
                    </div>

                    <div className="flex flex-col gap-2 pt-1">
                      <h3 className="font-display text-xl text-foreground font-light">
                        {step.subtitle}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                        {step.instruction}
                      </p>
                      <p className="text-[11px] text-accent/90 font-sans italic pt-1 border-t border-border/60">
                        Tip: {step.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                03. STANDARD SIZING CHART
            ───────────────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-8 border-t border-border pt-12 sm:pt-16">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex flex-col gap-1 max-w-xl">
                  <span className="eyebrow text-accent">Reference Table</span>
                  <h2 className="font-display font-light text-3xl sm:text-4xl text-foreground tracking-tight">
                    Standard Size Chart
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-sans">
                    Measurements represent the width in millimeters (mm) across the widest curve of the nail bed from Thumb to Pinky.
                  </p>
                </div>

                <div className="inline-flex items-center gap-1.5 text-xs text-accent bg-accent-subtle/50 px-3 py-1.5 border border-accent/30 self-start md:self-auto">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="text-[11px] uppercase tracking-wider font-mono">
                    Custom millimeter sizing is also available
                  </span>
                </div>
              </div>

              {/* Responsive Sizing Table */}
              <div className="overflow-x-auto border border-border bg-surface shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-surface-subtle">
                      <th className="p-3.5 sm:p-4 font-mono uppercase tracking-wider text-foreground font-semibold text-[11px]">
                        Size
                      </th>
                      <th className="p-3.5 sm:p-4 font-sans text-muted-foreground font-medium hidden sm:table-cell">
                        Fit Profile
                      </th>
                      {fingerLabels.map((finger) => (
                        <th
                          key={finger}
                          className="p-3.5 sm:p-4 font-mono uppercase tracking-wider text-center text-foreground font-semibold text-[11px]"
                        >
                          {finger}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {standardSizesData.map((row) => (
                      <tr
                        key={row.size}
                        className="hover:bg-accent-subtle/20 transition-colors"
                      >
                        <td className="p-3.5 sm:p-4 font-mono font-semibold text-foreground text-sm">
                          <span className="px-2 py-0.5 bg-surface-subtle border border-border">
                            {row.size}
                          </span>
                        </td>
                        <td className="p-3.5 sm:p-4 text-muted-foreground hidden sm:table-cell font-sans">
                          {row.description}
                        </td>
                        {row.measurements.map((mm, idx) => (
                          <td
                            key={idx}
                            className="p-3.5 sm:p-4 text-center font-mono text-foreground font-medium"
                          >
                            {mm} mm
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                04. SHAPE & SILHOUETTE GUIDE
            ───────────────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-8 border-t border-border pt-12 sm:pt-16">
              <div className="flex flex-col gap-1 max-w-xl">
                <span className="eyebrow text-accent">Silhouettes & Finishes</span>
                <h2 className="font-display font-light text-3xl sm:text-4xl text-foreground tracking-tight">
                  Available Nail Shapes
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-sans">
                  Choose a shape that matches your daily lifestyle and aesthetic preference.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
                {shapeGuideData.map((shape) => (
                  <div
                    key={shape.name}
                    className="p-5 border border-border bg-surface flex flex-col gap-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between border-b border-border/80 pb-2">
                      <h3 className="font-display text-xl text-foreground font-light">
                        {shape.name}
                      </h3>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed font-sans flex-1">
                      {shape.description}
                    </p>

                    <div className="pt-2 border-t border-border/60">
                      <span className="text-[10px] uppercase font-mono text-accent block">
                        Best For
                      </span>
                      <span className="text-[11px] text-foreground leading-tight font-sans">
                        {shape.bestFor}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                05. "BETWEEN SIZES OR NOT SURE?" REASSURANCE STRIP
            ───────────────────────────────────────────────────────────── */}
            <div className="border border-border bg-surface-subtle/30 p-8 sm:p-12 lg:p-14 flex flex-col gap-8">
              <div className="flex flex-col gap-2 max-w-xl">
                <div className="inline-flex items-center gap-1.5 text-accent text-xs">
                  <HelpCircle className="h-3.5 w-3.5" />
                  <span className="eyebrow text-accent">Fit Advice</span>
                </div>
                <h3 className="font-display font-light text-2xl sm:text-3xl text-foreground">
                  Between Sizes or Unsure?
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 border-t border-border/80 pt-6">
                {sizeGuideAdvice.map((advice, index) => (
                  <div key={index} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                      <span className="text-xs uppercase tracking-[0.14em] font-medium text-foreground">
                        {advice.title}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-sans pl-6">
                      {advice.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                06. CLOSING ACTION CTA
            ───────────────────────────────────────────────────────────── */}
            <div className="text-center flex flex-col items-center gap-5 max-w-xl mx-auto py-8">
              <span className="eyebrow text-accent tracking-[0.2em]">
                {sizeGuideCta.eyebrow}
              </span>

              <h2 className="font-display font-light text-3xl sm:text-4xl lg:text-5xl text-foreground tracking-tight text-balance">
                {sizeGuideCta.title}
              </h2>

              <p className="text-sm text-muted-foreground leading-relaxed font-sans max-w-md -mt-1">
                {sizeGuideCta.description}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-3 w-full max-w-xs sm:max-w-none">
                <Button
                  href={sizeGuideCta.primaryCta.href}
                  variant="primary"
                  size="md"
                  className="w-full sm:w-auto sm:px-8"
                >
                  {sizeGuideCta.primaryCta.label}
                </Button>

                <Button
                  href={sizeGuideCta.secondaryCta.href}
                  variant="outline"
                  size="md"
                  className="w-full sm:w-auto sm:px-8"
                >
                  {sizeGuideCta.secondaryCta.label}
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </div>
    </Shell>
  );
}
