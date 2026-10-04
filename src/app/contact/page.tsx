import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Shell } from "@/components/layout/Shell";
import { Container } from "@/components/layout/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { contactHero } from "@/data/contact";
import {
  BUSINESS_EMAIL_HREF,
  BUSINESS_PHONE_HREF,
  businessContactRows,
  businessDetails,
} from "@/config/business";
import { Sparkles, ArrowRight, Mail, Phone, MapPin, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact the Studio — Nails by Fufs",
  description:
    "Contact Nails by Fufs by email or phone for questions about sizing, orders, custom commissions, or studio assistance.",
};

const POLICY_LINKS = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Returns & Refunds", href: "/returns-refunds" },
  { label: "Shipping & Service Policy", href: "/shipping-policy" },
  { label: "Terms & Conditions", href: "/terms" },
];

export default function ContactPage() {
  return (
    <Shell>
      <div className="py-10 sm:py-14 lg:py-20 bg-background">
        <Container size="wide">
          <div className="flex flex-col gap-12 sm:gap-16 lg:gap-20">
            {/* ─────────────────────────────────────────────────────────────
                01. BREADCRUMBS & HERO
            ───────────────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-6 max-w-2xl mx-auto text-center">
              <div className="self-center">
                <Breadcrumbs
                  items={[
                    { label: "Home", href: "/" },
                    { label: "Contact" },
                  ]}
                />
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <span className="eyebrow text-accent tracking-[0.2em]">
                  {contactHero.eyebrow}
                </span>

                <h1 className="font-display font-light text-4xl sm:text-5xl lg:text-6xl text-foreground tracking-tight text-balance">
                  {contactHero.title}
                </h1>

                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-sans max-w-lg mx-auto">
                  {contactHero.description}
                </p>
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                02. DIRECT CONTACT METHODS & COMMISSION REFERRAL
            ───────────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 max-w-4xl mx-auto w-full items-start">
              {/* Direct Contact Card (Left 7 Cols) */}
              <div className="lg:col-span-7">
                <div className="p-6 sm:p-8 border border-border bg-surface flex flex-col gap-5">
                  <div className="flex flex-col gap-1">
                    <span className="eyebrow text-accent">Direct Contact</span>
                    <h2 className="font-display font-light text-2xl text-foreground">
                      Reach the Studio
                    </h2>
                    <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                      Email and phone are the studio&apos;s contact channels for sizing
                      advice, order questions and commissions.
                    </p>
                  </div>

                  <div className="flex flex-col divide-y divide-border/60 border-y border-border/60">
                    <a
                      href={BUSINESS_EMAIL_HREF}
                      className="flex items-center gap-3 py-3.5 group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                    >
                      <span className="w-9 h-9 shrink-0 border border-border bg-surface-subtle flex items-center justify-center text-accent">
                        <Mail className="h-4 w-4" />
                      </span>
                      <span className="flex flex-col min-w-0">
                        <span className="text-[11px] uppercase tracking-wider font-mono text-muted-foreground">
                          Email
                        </span>
                        <span className="text-sm text-foreground font-sans group-hover:text-accent transition-colors truncate">
                          {businessDetails.email}
                        </span>
                      </span>
                    </a>

                    <a
                      href={BUSINESS_PHONE_HREF}
                      className="flex items-center gap-3 py-3.5 group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                    >
                      <span className="w-9 h-9 shrink-0 border border-border bg-surface-subtle flex items-center justify-center text-accent">
                        <Phone className="h-4 w-4" />
                      </span>
                      <span className="flex flex-col min-w-0">
                        <span className="text-[11px] uppercase tracking-wider font-mono text-muted-foreground">
                          Phone
                        </span>
                        <span className="text-sm text-foreground font-sans group-hover:text-accent transition-colors">
                          {businessDetails.phone}
                        </span>
                      </span>
                    </a>

                    <div className="flex items-center gap-3 py-3.5">
                      <span className="w-9 h-9 shrink-0 border border-border bg-surface-subtle flex items-center justify-center text-accent">
                        <MapPin className="h-4 w-4" />
                      </span>
                      <span className="flex flex-col min-w-0">
                        <span className="text-[11px] uppercase tracking-wider font-mono text-muted-foreground">
                          Studio
                        </span>
                        <span className="text-sm text-foreground font-sans">
                          {businessDetails.addressLines.join(", ")}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Referral & Policy Links (Right 5 Cols) */}
              <div className="lg:col-span-5 flex flex-col gap-6 lg:border-l lg:border-border lg:pl-10">
                {/* Bespoke Commission Callout */}
                <div className="p-6 border border-border bg-surface-subtle/30 flex flex-col gap-3">
                  <div className="inline-flex items-center gap-1.5 text-accent text-xs">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span className="eyebrow text-accent">Bespoke Requests</span>
                  </div>
                  <h3 className="font-display text-xl text-foreground font-light">
                    Commissioning a Custom Set?
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                    If you have specific shape, length, and photo reference inspiration, our dedicated custom request form is the best place to submit your ideas.
                  </p>
                  <div className="pt-1">
                    <Link
                      href="/custom"
                      className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-accent hover:underline font-medium"
                    >
                      <span>Go to Custom Order Form</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Policy Links */}
                <div className="p-6 border border-border bg-surface flex flex-col gap-3">
                  <div className="inline-flex items-center gap-1.5 text-accent text-xs">
                    <FileText className="h-3.5 w-3.5" />
                    <span className="eyebrow text-accent">Policies</span>
                  </div>
                  <h3 className="font-display text-xl text-foreground font-light">
                    How Orders Work
                  </h3>
                  <ul className="flex flex-col gap-2 text-xs">
                    {POLICY_LINKS.map((policy) => (
                      <li key={policy.href}>
                        <Link
                          href={policy.href}
                          className="text-muted-foreground hover:text-accent transition-colors underline-offset-4 hover:underline"
                        >
                          {policy.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                03. BUSINESS INFORMATION
            ───────────────────────────────────────────────────────────── */}
            <section
              aria-labelledby="business-information-heading"
              className="max-w-4xl mx-auto w-full flex flex-col gap-6"
            >
              <div className="flex flex-col gap-2">
                <span className="eyebrow text-accent tracking-[0.2em]">Studio Information</span>
                <h2
                  id="business-information-heading"
                  className="font-display font-light text-2xl sm:text-3xl text-foreground tracking-tight"
                >
                  Business Information
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-sans max-w-xl">
                  The studio&apos;s published contact details. These also appear on our policy pages.
                </p>
              </div>

              <dl className="border border-border bg-surface divide-y divide-border/60">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 px-5 py-3.5">
                  <dt className="text-[11px] uppercase tracking-wider font-mono text-muted-foreground sm:w-52 shrink-0">
                    Business name
                  </dt>
                  <dd className="text-sm text-foreground font-sans">{businessDetails.brandName}</dd>
                </div>

                {businessContactRows().map((row) => (
                  <div
                    key={row.label}
                    className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 px-5 py-3.5"
                  >
                    <dt className="text-[11px] uppercase tracking-wider font-mono text-muted-foreground sm:w-52 shrink-0">
                      {row.label}
                    </dt>
                    <dd className="text-sm text-foreground font-sans">{row.value}</dd>
                  </div>
                ))}
              </dl>

              <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                Our{" "}
                <Link href="/privacy-policy" className="text-accent hover:underline underline-offset-4">
                  Privacy Policy
                </Link>
                ,{" "}
                <Link href="/returns-refunds" className="text-accent hover:underline underline-offset-4">
                  Returns &amp; Refunds
                </Link>
                ,{" "}
                <Link href="/shipping-policy" className="text-accent hover:underline underline-offset-4">
                  Shipping &amp; Service Policy
                </Link>{" "}
                and{" "}
                <Link href="/terms" className="text-accent hover:underline underline-offset-4">
                  Terms &amp; Conditions
                </Link>{" "}
                explain how orders, delivery and your information are handled.
              </p>
            </section>
          </div>
        </Container>
      </div>
    </Shell>
  );
}
