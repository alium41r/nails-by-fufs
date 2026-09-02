import React from "react";
import type { Metadata } from "next";
import { Shell } from "@/components/layout/Shell";
import { Container } from "@/components/layout/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { CustomOrderForm } from "@/components/custom/CustomOrderForm";
import { Sparkles, Palette, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Custom Orders — Bespoke Handcrafted Nails by Fufs",
  description:
    "Commission a one-of-a-kind custom press-on nail set designed and handcrafted by independent artist Fufs.",
};

export default function CustomOrderPage() {
  return (
    <Shell>
      <div className="py-10 sm:py-14 lg:py-20 bg-background">
        <Container size="wide">
          <div className="flex flex-col gap-10 sm:gap-14 lg:gap-18">
            {/* Navigation & Breadcrumbs */}
            <Breadcrumbs
              items={[
                { label: "Home", href: "/" },
                { label: "Bespoke Requests" },
              ]}
            />

            {/* Editorial Hero Header */}
            <div className="flex flex-col items-center text-center gap-4 max-w-2xl mx-auto">
              <span className="eyebrow text-accent tracking-[0.2em]">
                Bespoke Commissions
              </span>

              <h1 className="font-display font-light text-4xl sm:text-5xl lg:text-6xl text-foreground tracking-tight text-balance">
                Let&apos;s make something yours.
              </h1>

              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-sans max-w-lg">
                Have a specific concept, colorway, wedding, or event in mind? Share your inspiration below, and work directly with Fatima to create a set tailored to your aesthetic.
              </p>
            </div>

            {/* 3-Step Process Mini Strip (Airy & Quiet) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-y border-border bg-surface-subtle/30 px-6 sm:px-8">
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-accent-subtle border border-accent/30 flex items-center justify-center text-accent shrink-0 mt-0.5">
                  <Palette className="h-4 w-4" />
                </div>
                <div className="flex flex-col gap-0.5 text-left">
                  <span className="text-xs uppercase tracking-wider font-medium text-foreground">
                    01 • Share Your Vision
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Upload screenshots, moodboards, or describe your concept.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-accent-subtle border border-accent/30 flex items-center justify-center text-accent shrink-0 mt-0.5">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="flex flex-col gap-0.5 text-left">
                  <span className="text-xs uppercase tracking-wider font-medium text-foreground">
                    02 • Sizing & Consultation
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    We confirm your exact sizes with a complimentary kit or measurements.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-accent-subtle border border-accent/30 flex items-center justify-center text-accent shrink-0 mt-0.5">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="flex flex-col gap-0.5 text-left">
                  <span className="text-xs uppercase tracking-wider font-medium text-foreground">
                    03 • Handcrafted by Fufs
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Each custom set is painted, sealed, and packaged by hand in the studio.
                  </p>
                </div>
              </div>
            </div>

            {/* Main Custom Order Form */}
            <div className="w-full">
              <CustomOrderForm />
            </div>
          </div>
        </Container>
      </div>
    </Shell>
  );
}
