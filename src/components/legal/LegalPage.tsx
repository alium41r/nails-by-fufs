import React from "react";
import Link from "next/link";
import { ArrowRight, Mail, MapPin, Phone } from "lucide-react";

import { Container } from "@/components/layout/Container";
import { Shell } from "@/components/layout/Shell";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import {
  BUSINESS_EMAIL_HREF,
  BUSINESS_PHONE_HREF,
  POLICY_CONTACT_HREF,
  POLICY_LAST_UPDATED,
  businessDetails,
  businessContactRows,
} from "@/config/business";

/**
 * Shared presentation for the public policy pages (privacy, returns, shipping,
 * terms) so they all match the storefront's visual language and stay consistent.
 *
 * Copy lives with each page; this component only renders structure, the
 * "last updated" line, the section index and the confirmed business details.
 */

export interface LegalSection {
  id: string;
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

function SectionIndex({ sections }: { sections: LegalSection[] }) {
  return (
    <nav
      aria-label="On this page"
      className="border border-border bg-surface-subtle/30 p-5 sm:p-6 flex flex-col gap-3"
    >
      <span className="eyebrow text-accent">On This Page</span>
      <ol className="flex flex-col gap-1.5 text-xs sm:text-sm">
        {sections.map((section, index) => (
          <li key={section.id} className="flex gap-2">
            <span className="font-mono text-muted-foreground w-5 shrink-0">
              {String(index + 1).padStart(2, "0")}
            </span>
            <a
              href={`#${section.id}`}
              className="text-foreground hover:text-accent transition-colors underline-offset-4 hover:underline"
            >
              {section.heading}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function BusinessContactBlock() {
  return (
    <section
      aria-labelledby="business-details-heading"
      className="border border-border bg-surface p-6 sm:p-8 flex flex-col gap-5"
    >
      <div className="flex flex-col gap-1">
        <span className="eyebrow text-accent">Business Information</span>
        <h2
          id="business-details-heading"
          className="font-display font-light text-2xl text-foreground"
        >
          {businessDetails.brandName}
        </h2>
      </div>

      <dl className="flex flex-col gap-3 text-xs sm:text-sm">
        {businessContactRows().map((row) => (
          <div key={row.label} className="flex flex-col sm:flex-row sm:gap-3">
            <dt className="text-muted-foreground sm:w-32 shrink-0">{row.label}</dt>
            <dd className="text-foreground font-sans">{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-xs sm:text-sm">
        <a
          href={BUSINESS_EMAIL_HREF}
          className="inline-flex items-center gap-1.5 text-accent hover:underline font-medium"
        >
          <Mail className="h-3.5 w-3.5" />
          <span>{businessDetails.email}</span>
        </a>
        <a
          href={BUSINESS_PHONE_HREF}
          className="inline-flex items-center gap-1.5 text-accent hover:underline font-medium"
        >
          <Phone className="h-3.5 w-3.5" />
          <span>{businessDetails.phone}</span>
        </a>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 text-accent" />
          <span>{businessDetails.addressLines.join(", ")}</span>
        </span>
      </div>

      <Link
        href={POLICY_CONTACT_HREF}
        className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-accent hover:underline font-medium"
      >
        <span>Contact the Studio</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}

export interface LegalPageProps {
  eyebrow: string;
  title: string;
  description: string;
  intro?: string[];
  sections: LegalSection[];
}

export function LegalPage({ eyebrow, title, description, intro, sections }: LegalPageProps) {
  return (
    <Shell>
      <div className="py-10 sm:py-14 lg:py-20 bg-background">
        <Container size="narrow">
          <div className="flex flex-col gap-10 sm:gap-14">
            <div className="flex flex-col gap-6">
              <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: title }]} />

              <div className="flex flex-col gap-3 pt-2">
                <span className="eyebrow text-accent tracking-[0.2em]">{eyebrow}</span>
                <h1 className="font-display font-light text-4xl sm:text-5xl text-foreground tracking-tight text-balance">
                  {title}
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-sans max-w-xl">
                  {description}
                </p>
                <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground pt-1">
                  Last updated: {POLICY_LAST_UPDATED}
                </p>
              </div>
            </div>

            {intro && intro.length > 0 && (
              <div className="flex flex-col gap-4 text-sm text-muted-foreground leading-relaxed font-sans">
                {intro.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            )}

            <SectionIndex sections={sections} />

            <div className="flex flex-col gap-10 sm:gap-12">
              {sections.map((section, index) => (
                <section
                  key={section.id}
                  id={section.id}
                  aria-labelledby={`${section.id}-heading`}
                  className="flex flex-col gap-4 scroll-mt-28"
                >
                  <div className="flex items-baseline gap-3 border-b border-border pb-2">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h2
                      id={`${section.id}-heading`}
                      className="font-display font-light text-xl sm:text-2xl text-foreground tracking-tight"
                    >
                      {section.heading}
                    </h2>
                  </div>

                  {section.paragraphs?.map((paragraph) => (
                    <p
                      key={paragraph}
                      className="text-sm text-muted-foreground leading-relaxed font-sans"
                    >
                      {paragraph}
                    </p>
                  ))}

                  {section.bullets && section.bullets.length > 0 && (
                    <ul className="flex flex-col gap-2 text-sm text-muted-foreground leading-relaxed font-sans list-disc pl-5">
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>

            <BusinessContactBlock />
          </div>
        </Container>
      </div>
    </Shell>
  );
}
