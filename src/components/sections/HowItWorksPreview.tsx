import React from "react";
import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { StudioContent } from "@/components/studio/StudioContent";
import type { HowItWorksContent } from "@/lib/site-content-schema";
import { ArrowRight, ArrowUpRight } from "lucide-react";

/**
 * The homepage guide hub.
 *
 * This band used to be four numbered process steps — Choose, Size, Apply, Wear —
 * which described the process on the homepage and then left the reader to find
 * the page that explained it. It is now a set of signposts: each card is the
 * destination itself (sizing, application, delivery, care), so the section can no
 * longer disagree with the pages it points at.
 *
 * ## Why the card copy is not wrapped in `StudioContent`
 *
 * `StudioContent` renders its edit trigger as a `<button>`, and a button inside
 * an anchor is invalid markup as well as a click conflict. Every other call site
 * in the storefront observes the same rule by putting the affordance *outside*
 * the link (`<StudioContent as="div"><Link/></StudioContent>`), which a
 * whole-card link cannot do without pushing the trigger out of the card. The
 * cards are therefore plain text, exactly like the CTA labels elsewhere, and are
 * edited through the `home.howItWorks` document in the Studio panel — where they
 * appear as a labelled "Guide cards" block.
 *
 * ## Why the count is not fixed
 *
 * The grid is 1-up, 2-up and 3-up, so an owner may add or remove cards and the
 * layout follows. Cards stretch to a shared row height, so a short description
 * next to a long one still reads as a grid rather than as ragged columns.
 */
export function HowItWorksPreview({ content }: { content: HowItWorksContent }) {
  return (
    <section
      className="py-16 sm:py-24 border-b border-border bg-surface-subtle/30"
      aria-labelledby="how-it-works-heading"
    >
      <Container size="wide">
        <div className="flex flex-col gap-8 sm:gap-10 lg:gap-12">
          {/* Section Header */}
          <div className="flex flex-col gap-4 pb-4 border-b border-border/70 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-2 max-w-xl">
              <StudioContent
                target={{ key: "home.howItWorks", field: "eyebrow", label: "Eyebrow" }}
                className="eyebrow text-accent tracking-[0.2em]"
              >
                {content.eyebrow}
              </StudioContent>
              <h2
                id="how-it-works-heading"
                className="font-display font-light text-3xl sm:text-4xl text-foreground tracking-tight text-balance"
              >
                <StudioContent
                  target={{ key: "home.howItWorks", field: "title", label: "Title" }}
                >
                  {content.title}
                </StudioContent>
              </h2>
              <StudioContent
                as="div"
                target={{ key: "home.howItWorks", field: "description", label: "Description" }}
                className="text-sm text-muted-foreground leading-relaxed font-sans"
              >
                {content.description}
              </StudioContent>
            </div>

            <StudioContent
              as="div"
              target={{ key: "home.howItWorks", field: "cta", label: "Guide link" }}
            >
              <Link
                href={content.cta.href}
                className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-foreground hover:text-accent transition-colors group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent py-1"
              >
                <span>{content.cta.label}</span>
                <ArrowRight className="h-3.5 w-3.5 text-accent transition-transform duration-150 group-hover:translate-x-1" />
              </Link>
            </StudioContent>
          </div>

          {/* Guide cards: square hairline containers, one destination each */}
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {content.links.map((card, index) => (
              <li key={`${card.href}-${index}`} className="h-full">
                <Link
                  href={card.href}
                  className="group flex h-full flex-col justify-between gap-4 border border-border/70 bg-background/60 p-5 transition-colors duration-200 hover:border-accent/60 hover:bg-surface focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent sm:p-6"
                >
                  <span className="flex items-start justify-between gap-4">
                    <span className="font-display font-light text-lg sm:text-xl text-foreground tracking-wide text-balance">
                      {card.title}
                    </span>
                    <ArrowUpRight
                      aria-hidden="true"
                      className="mt-1 h-4 w-4 shrink-0 text-accent transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    />
                  </span>
                  <span className="block text-xs sm:text-sm text-muted-foreground leading-relaxed font-sans">
                    {card.description}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
