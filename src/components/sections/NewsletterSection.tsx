"use client";

import React from "react";

import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { StudioContent } from "@/components/studio/StudioContent";
import type { HomeNewsletterContent, SiteContact } from "@/lib/site-content-schema";

/**
 * The homepage release-list band.
 *
 * A Client Component because it is part of the Studio overlay tree, so it takes
 * its copy and the contact address as props rather than reading them. There is
 * still no newsletter backend: the button opens the studio's real inbox, which is
 * the channel that actually works, and the `mailto:` subject is owner-managed so
 * the studio can tell release-list mail apart.
 */
export function NewsletterSection({
  content,
  contact,
}: {
  content: HomeNewsletterContent;
  contact: SiteContact;
}) {
  const emailHref = `mailto:${contact.email}`;
  const subject = content.emailSubject || "Studio release updates";

  return (
    <section
      className="py-16 sm:py-24 border-b border-border bg-background"
      aria-labelledby="newsletter-heading"
    >
      <Container size="narrow">
        <div className="flex flex-col items-center text-center gap-4 max-w-md mx-auto">
          <StudioContent
            target={{ key: "home.newsletter", field: "eyebrow", label: "Eyebrow" }}
            className="eyebrow text-accent tracking-[0.2em]"
          >
            {content.eyebrow}
          </StudioContent>

          <h2
            id="newsletter-heading"
            className="font-display font-light text-2xl sm:text-3xl lg:text-4xl text-foreground tracking-tight text-balance"
          >
            <StudioContent target={{ key: "home.newsletter", field: "title", label: "Title" }}>
              {content.title}
            </StudioContent>
          </h2>

          <StudioContent
            as="div"
            target={{ key: "home.newsletter", field: "description", label: "Description" }}
            className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-sans"
          >
            {content.description}
          </StudioContent>

          <div className="w-full pt-3 flex flex-col items-center gap-2.5">
            {/* No newsletter backend exists yet, so this opens the studio's real
                inbox instead of collecting an address and confirming a
                subscription that was never recorded. */}
            <StudioContent
              as="div"
              target={{ key: "home.newsletter", field: "ctaLabel", label: "Button label" }}
            >
              <Button
                href={`${emailHref}?subject=${encodeURIComponent(subject)}`}
                variant="primary"
                size="md"
                className="text-xs uppercase tracking-wider sm:px-8"
              >
                {content.ctaLabel}
              </Button>
            </StudioContent>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Opens your email app, or write to {contact.email}.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
