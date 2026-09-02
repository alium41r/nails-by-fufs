import React from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { howItWorksContent, processSteps } from "@/data/homepage";
import { ArrowRight } from "lucide-react";

export function HowItWorksPreview() {
  return (
    <section
      className="py-16 sm:py-24 border-b border-border bg-surface-subtle/30"
      aria-labelledby="how-it-works-heading"
    >
      <Container size="wide">
        <div className="flex flex-col gap-10 lg:gap-14">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-border/70">
            <div className="flex flex-col gap-2 max-w-xl">
              <span className="eyebrow text-accent tracking-[0.2em]">
                {howItWorksContent.eyebrow}
              </span>
              <h2
                id="how-it-works-heading"
                className="font-display font-light text-3xl sm:text-4xl text-foreground tracking-tight text-balance"
              >
                {howItWorksContent.title}
              </h2>
            </div>

            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-foreground hover:text-accent transition-colors group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent py-1"
            >
              <span>Application Guide</span>
              <ArrowRight className="h-3.5 w-3.5 text-accent transition-transform duration-150 group-hover:translate-x-1" />
            </Link>
          </div>

          {/* 4 Steps: Airy minimal rhythm (not heavy card boxes) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-10">
            {processSteps.map((step) => (
              <div
                key={step.number}
                className="flex flex-col gap-3 pt-2"
              >
                <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                  <span className="font-mono text-xs text-accent tracking-widest font-semibold">
                    {step.number}
                  </span>
                </div>
                <h3 className="font-display text-xl sm:text-2xl text-foreground font-light tracking-wide">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-sans">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
