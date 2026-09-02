import React from "react";
import type { Metadata } from "next";
import { Shell } from "@/components/layout/Shell";
import { Container } from "@/components/layout/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { FaqAccordion } from "@/components/faq/FaqAccordion";
import { faqHero, faqCta } from "@/data/faq";

export const metadata: Metadata = {
  title: "Frequently Asked Questions — Nails by Fufs",
  description:
    "Common questions regarding handcrafted press-on nails, custom commissions, sizing measurements, and gentle application.",
};

export default function FaqPage() {
  return (
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
                <span className="eyebrow text-accent tracking-[0.2em]">
                  {faqHero.eyebrow}
                </span>

                <h1 className="font-display font-light text-4xl sm:text-5xl lg:text-6xl text-foreground tracking-tight text-balance">
                  {faqHero.title}
                </h1>

                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-sans max-w-lg mx-auto">
                  {faqHero.description}
                </p>
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                02. ACCORDION LIST
            ───────────────────────────────────────────────────────────── */}
            <div className="w-full">
              <FaqAccordion />
            </div>

            {/* ─────────────────────────────────────────────────────────────
                03. CLOSING CTA
            ───────────────────────────────────────────────────────────── */}
            <div className="text-center flex flex-col items-center gap-5 max-w-xl mx-auto py-8 border-t border-border">
              <span className="eyebrow text-accent tracking-[0.2em]">
                {faqCta.eyebrow}
              </span>

              <h2 className="font-display font-light text-3xl sm:text-4xl text-foreground tracking-tight text-balance">
                {faqCta.title}
              </h2>

              <p className="text-sm text-muted-foreground leading-relaxed font-sans max-w-md -mt-1">
                {faqCta.description}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-3 w-full max-w-xs sm:max-w-none">
                <Button
                  href={faqCta.primaryCta.href}
                  variant="primary"
                  size="md"
                  className="w-full sm:w-auto sm:px-8"
                >
                  {faqCta.primaryCta.label}
                </Button>

                <Button
                  href={faqCta.secondaryCta.href}
                  variant="outline"
                  size="md"
                  className="w-full sm:w-auto sm:px-8"
                >
                  {faqCta.secondaryCta.label}
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </div>
    </Shell>
  );
}
