import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Shell } from "@/components/layout/Shell";
import { Container } from "@/components/layout/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ContactForm } from "@/components/contact/ContactForm";
import { contactHero } from "@/data/contact";
import { Sparkles, MessageCircle, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact the Studio — Nails by Fufs",
  description:
    "Get in touch with independent nail artist Fatima for questions regarding sizing, custom orders, or studio assistance.",
};

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
                02. CONTACT FORM & DIRECT INQUIRY BOX
            ───────────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 max-w-4xl mx-auto w-full items-start">
              {/* Main Form Column (Left 7 Cols) */}
              <div className="lg:col-span-7">
                <ContactForm />
              </div>

              {/* Helpful Channels & Commission Referral (Right 5 Cols) */}
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

                {/* Direct Studio Chat Note */}
                <div className="p-6 border border-border bg-surface flex flex-col gap-3">
                  <div className="inline-flex items-center gap-1.5 text-accent text-xs">
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span className="eyebrow text-accent">Direct Messaging</span>
                  </div>
                  <h3 className="font-display text-xl text-foreground font-light">
                    Prefer Instagram DM?
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                    Feel free to reach out directly through Instagram direct messages to chat about designs, availability, or sizing advice.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </div>
    </Shell>
  );
}
