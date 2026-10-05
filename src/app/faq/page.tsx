import React from "react";
import type { Metadata } from "next";

import { Shell } from "@/components/layout/Shell";
import { Container } from "@/components/layout/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { FaqAccordion } from "@/components/faq/FaqAccordion";
import { StudioBoundary } from "@/components/studio/StudioBoundary";
import { StudioContent } from "@/components/studio/StudioContent";
import { getSiteContent } from "@/lib/site-content";

/**
 * The FAQ page.
 *
 * Hero copy, categories, questions, answers, the closing call to action and the
 * note under the list are all owner-managed through the `page.faq` document. The
 * page keeps its layout, the breadcrumb and the accordion behaviour.
 */

/*
 * Metadata stays a static export rather than `generateMetadata()`, and that is
 * deliberate: a page-level `generateMetadata` is fine, but this page's title and
 * description describe the page rather than its content, and reading them from
 * the database would add a query to every crawl for no editing benefit. The FAQ
 * *content* is what the owner manages here.
 */
export const metadata: Metadata = {
  title: "Frequently Asked Questions — Nails by Fufs",
  description:
    "Common questions regarding handcrafted press-on nails, custom commissions, sizing measurements, and gentle application.",
};

export default async function FaqPage() {
  const { faq } = await getSiteContent();

  return (
    <StudioBoundary>
      <Shell>
        <div className="py-10 sm:py-14 lg:py-20 bg-background">
          <Container size="wide">
            <div className="flex flex-col gap-14 sm:gap-18 lg:gap-24">
              {/* ─────────────────────────────────────────────────────────────
                  01. BREADCRUMBS & HERO
              ───────────────────────────────────────────────────────────── */}
              <div className="flex flex-col gap-6 max-w-2xl mx-auto text-center">
                <div className="self-center">
                  <Breadcrumbs
                    items={[
                      { label: "Home", href: "/" },
                      { label: "FAQ" },
                    ]}
                  />
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <StudioContent
                    target={{ key: "page.faq", field: "hero.eyebrow", label: "Eyebrow" }}
                    className="eyebrow text-accent tracking-[0.2em]"
                  >
                    {faq.hero.eyebrow}
                  </StudioContent>

                  <h1 className="font-display font-light text-4xl sm:text-5xl lg:text-6xl text-foreground tracking-tight text-balance">
                    <StudioContent
                      target={{ key: "page.faq", field: "hero.title", label: "Title" }}
                    >
                      {faq.hero.title}
                    </StudioContent>
                  </h1>

                  <StudioContent
                    as="div"
                    target={{ key: "page.faq", field: "hero.description", label: "Description" }}
                    className="text-sm sm:text-base text-muted-foreground leading-relaxed font-sans max-w-lg mx-auto"
                  >
                    {faq.hero.description}
                  </StudioContent>
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  02. ACCORDION LIST
              ───────────────────────────────────────────────────────────── */}
              <div className="w-full">
                <FaqAccordion
                  items={faq.items}
                  categories={faq.categories}
                  footerNote={faq.footerNote}
                />
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  03. CLOSING CTA
              ───────────────────────────────────────────────────────────── */}
              <div className="text-center flex flex-col items-center gap-5 max-w-xl mx-auto py-8 border-t border-border">
                <StudioContent
                  target={{ key: "page.faq", field: "cta.eyebrow", label: "CTA eyebrow" }}
                  className="eyebrow text-accent tracking-[0.2em]"
                >
                  {faq.cta.eyebrow}
                </StudioContent>

                <h2 className="font-display font-light text-3xl sm:text-4xl text-foreground tracking-tight text-balance">
                  <StudioContent target={{ key: "page.faq", field: "cta.title", label: "CTA title" }}>
                    {faq.cta.title}
                  </StudioContent>
                </h2>

                <StudioContent
                  as="div"
                  target={{ key: "page.faq", field: "cta.description", label: "CTA description" }}
                  className="text-sm text-muted-foreground leading-relaxed font-sans max-w-md -mt-1"
                >
                  {faq.cta.description}
                </StudioContent>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-3 w-full max-w-xs sm:max-w-none">
                  <StudioContent
                    as="div"
                    target={{ key: "page.faq", field: "cta.primaryCta", label: "Primary CTA" }}
                  >
                    <Button
                      href={faq.cta.primaryCta.href}
                      variant="primary"
                      size="md"
                      className="w-full sm:w-auto sm:px-8"
                    >
                      {faq.cta.primaryCta.label}
                    </Button>
                  </StudioContent>

                  <StudioContent
                    as="div"
                    target={{ key: "page.faq", field: "cta.secondaryCta", label: "Secondary CTA" }}
                  >
                    <Button
                      href={faq.cta.secondaryCta.href}
                      variant="outline"
                      size="md"
                      className="w-full sm:w-auto sm:px-8"
                    >
                      {faq.cta.secondaryCta.label}
                    </Button>
                  </StudioContent>
                </div>
              </div>
            </div>
          </Container>
        </div>
      </Shell>
    </StudioBoundary>
  );
}
