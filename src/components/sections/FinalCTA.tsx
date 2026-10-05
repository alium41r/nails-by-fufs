import React from "react";

import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { StudioContent } from "@/components/studio/StudioContent";
import type { FinalCtaContent } from "@/lib/site-content-schema";

/** The closing call-to-action band. Copy and both destinations are owner-managed. */
export function FinalCTA({ content }: { content: FinalCtaContent }) {
  return (
    <section
      className="py-20 sm:py-28 border-b border-border bg-surface-subtle/30 text-center"
      aria-labelledby="final-cta-heading"
    >
      <Container size="narrow">
        <div className="flex flex-col items-center gap-6 max-w-xl mx-auto">
          <StudioContent
            target={{ key: "home.finalCta", field: "eyebrow", label: "Eyebrow" }}
            className="eyebrow text-accent tracking-[0.2em]"
          >
            {content.eyebrow}
          </StudioContent>

          <h2
            id="final-cta-heading"
            className="font-display font-light text-3xl sm:text-4xl lg:text-5xl text-foreground tracking-tight leading-tight text-balance"
          >
            <StudioContent target={{ key: "home.finalCta", field: "title", label: "Title" }}>
              {content.title}
            </StudioContent>
          </h2>

          <StudioContent
            as="div"
            target={{ key: "home.finalCta", field: "description", label: "Description" }}
            className="text-sm sm:text-base text-muted-foreground max-w-md leading-relaxed font-sans -mt-1"
          >
            {content.description}
          </StudioContent>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-3 w-full max-w-xs sm:max-w-none">
            <StudioContent
              as="div"
              target={{ key: "home.finalCta", field: "primaryCta", label: "Primary CTA" }}
            >
              <Button
                href={content.primaryCta.href}
                variant="primary"
                size="md"
                className="w-full sm:w-auto sm:px-8"
              >
                {content.primaryCta.label}
              </Button>
            </StudioContent>

            <StudioContent
              as="div"
              target={{ key: "home.finalCta", field: "secondaryCta", label: "Secondary CTA" }}
            >
              <Button
                href={content.secondaryCta.href}
                variant="outline"
                size="md"
                className="w-full sm:w-auto sm:px-8"
              >
                {content.secondaryCta.label}
              </Button>
            </StudioContent>
          </div>
        </div>
      </Container>
    </section>
  );
}
