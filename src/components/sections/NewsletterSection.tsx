"use client";

import React from "react";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { newsletterContent } from "@/data/homepage";
import { BUSINESS_EMAIL_HREF, businessDetails } from "@/config/business";

export function NewsletterSection() {
  return (
    <section
      className="py-16 sm:py-24 border-b border-border bg-background"
      aria-labelledby="newsletter-heading"
    >
      <Container size="narrow">
        <div className="flex flex-col items-center text-center gap-4 max-w-md mx-auto">
          <span className="eyebrow text-accent tracking-[0.2em]">
            {newsletterContent.eyebrow}
          </span>

          <h2
            id="newsletter-heading"
            className="font-display font-light text-2xl sm:text-3xl lg:text-4xl text-foreground tracking-tight text-balance"
          >
            {newsletterContent.title}
          </h2>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-sans">
            {newsletterContent.description}
          </p>

          <div className="w-full pt-3 flex flex-col items-center gap-2.5">
            {/* No newsletter backend exists yet, so this opens the studio's real
                inbox instead of collecting an address and confirming a
                subscription that was never recorded. */}
            <Button
              href={`${BUSINESS_EMAIL_HREF}?subject=${encodeURIComponent("Studio release updates")}`}
              variant="primary"
              size="md"
              className="text-xs uppercase tracking-wider sm:px-8"
            >
              Email to Join the Release List
            </Button>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Opens your email app, or write to {businessDetails.email}.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
