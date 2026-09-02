import React from "react";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { finalCtaContent } from "@/data/homepage";

export function FinalCTA() {
  return (
    <section
      className="py-20 sm:py-28 border-b border-border bg-surface-subtle/30 text-center"
      aria-labelledby="final-cta-heading"
    >
      <Container size="narrow">
        <div className="flex flex-col items-center gap-6 max-w-xl mx-auto">
          <span className="eyebrow text-accent tracking-[0.2em]">
            {finalCtaContent.eyebrow}
          </span>

          <h2
            id="final-cta-heading"
            className="font-display font-light text-3xl sm:text-4xl lg:text-5xl text-foreground tracking-tight leading-tight text-balance"
          >
            {finalCtaContent.title}
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground max-w-md leading-relaxed font-sans -mt-1">
            {finalCtaContent.description}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-3 w-full max-w-xs sm:max-w-none">
            <Button
              href={finalCtaContent.primaryCta.href}
              variant="primary"
              size="md"
              className="w-full sm:w-auto sm:px-8"
            >
              {finalCtaContent.primaryCta.label}
            </Button>

            <Button
              href={finalCtaContent.secondaryCta.href}
              variant="outline"
              size="md"
              className="w-full sm:w-auto sm:px-8"
            >
              {finalCtaContent.secondaryCta.label}
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
