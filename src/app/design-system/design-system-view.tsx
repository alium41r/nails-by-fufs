"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Media } from "@/components/media/Media";
import {
  ArrowLeft,
  ArrowRight,
  ShoppingBag,
  Heart,
  Search,
  Sparkles,
  Check,
  Maximize2,
} from "lucide-react";

export function DesignSystemView() {
  const [windowWidth, setWindowWidth] = useState<number | null>(null);
  const [buttonLoading, setButtonLoading] = useState(false);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const colorTokens = [
    { name: "--background", lightHex: "#FCEEF2", darkHex: "#171214", label: "Background", bgClass: "bg-background" },
    { name: "--foreground", lightHex: "#22141B", darkHex: "#F6EFEA", label: "Foreground", bgClass: "bg-foreground" },
    { name: "--surface", lightHex: "#FFF7F9", darkHex: "#221B1E", label: "Surface", bgClass: "bg-surface" },
    { name: "--surface-subtle", lightHex: "#F7E2EB", darkHex: "#2C2226", label: "Surface Subtle", bgClass: "bg-surface-subtle" },
    { name: "--muted", lightHex: "#F2DAE5", darkHex: "#271E22", label: "Muted Fill", bgClass: "bg-muted" },
    { name: "--muted-foreground", lightHex: "#7E636E", darkHex: "#A69B9E", label: "Muted Text", bgClass: "bg-muted-foreground" },
    { name: "--border", lightHex: "#E8CCD8", darkHex: "#3B2E33", label: "Border", bgClass: "bg-border" },
    { name: "--accent", lightHex: "#942948", darkHex: "#E8829C", label: "Accent", bgClass: "bg-accent" },
    { name: "--accent-hover", lightHex: "#7D1A36", darkHex: "#F2A3B8", label: "Accent Hover", bgClass: "bg-accent-hover" },
    { name: "--accent-subtle", lightHex: "#FBDCE7", darkHex: "#311620", label: "Accent Subtle", bgClass: "bg-accent-subtle" },
  ];

  const getBreakpointLabel = (w: number | null) => {
    if (!w) return "Detecting...";
    if (w <= 320) return "320px (Compact Mobile / SE)";
    if (w <= 375) return "375px (Standard iPhone)";
    if (w <= 390) return "390px (iPhone 14/15/16)";
    if (w <= 430) return "430px (iPhone Plus/Max)";
    if (w < 768) return `${w}px (Large Mobile)`;
    if (w < 1024) return `${w}px (Tablet / iPad)`;
    return `${w}px (Desktop)`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-accent-subtle">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-xs border-b border-border">
        <Container size="wide">
          <div className="flex h-16 items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Studio</span>
            </Link>

            <div className="flex items-center gap-2">
              <span className="font-display font-light text-lg sm:text-xl tracking-[0.18em]">
                NAILS BY FUFS
              </span>
              <span className="text-[10px] uppercase tracking-widest text-accent bg-accent-subtle px-2 py-0.5 border border-accent/20">
                Design System
              </span>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />

              {/* Live Breakpoint Indicator */}
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-surface-subtle px-3 py-1 border border-border">
                <Maximize2 className="h-3.5 w-3.5 text-accent" />
                <span>{getBreakpointLabel(windowWidth)}</span>
              </div>
            </div>
          </div>
        </Container>
      </header>

      {/* Intro Header */}
      <section className="py-12 sm:py-16 border-b border-border bg-surface-subtle/40">
        <Container size="wide">
          <div className="flex flex-col gap-3 max-w-3xl">
            <span className="eyebrow text-accent">Internal Reference • Phase 1</span>
            <h1 className="font-display font-light text-3xl sm:text-5xl text-foreground tracking-tight leading-[1.1]">
              Visual Design Tokens & Core Primitives
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              A centralized, tactile design system engineered for an independent press-on nail studio.
              All tokens are defined as CSS custom properties in <code className="bg-surface px-1.5 py-0.5 border border-border text-xs font-mono">globals.css</code> for seamless re-theming.
            </p>

            {/* Mobile Breakpoint Tag */}
            <div className="sm:hidden mt-2 text-xs text-muted-foreground bg-surface px-3 py-1.5 border border-border w-fit">
              Viewport: <strong className="text-foreground">{getBreakpointLabel(windowWidth)}</strong>
            </div>
          </div>
        </Container>
      </section>

      {/* Main Content Areas */}
      <main className="flex-1 py-12 sm:py-16">
        <Container size="wide" className="flex flex-col gap-16 sm:gap-24">
          {/* 1. COLOR TOKENS */}
          <section id="tokens" className="flex flex-col gap-8">
            <SectionHeading
              eyebrow="Color Palette"
              title="Centralized Color Tokens"
              subtitle="Warm neutral foundations with restrained terracotta rose accents. Zero hardcoded colors in primitives."
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
              {colorTokens.map((token) => (
                <div
                  key={token.name}
                  className="bg-surface border border-border p-3.5 flex flex-col gap-3 shadow-2xs"
                >
                  <div
                    className={`w-full h-16 sm:h-20 border border-black/5 ${token.bgClass}`}
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-foreground">
                      {token.label}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground mt-0.5">
                      L: {token.lightHex} • D: {token.darkHex}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground/70 mt-0.5">
                      {token.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 2. TYPOGRAPHY SYSTEM */}
          <section id="typography" className="flex flex-col gap-8">
            <SectionHeading
              eyebrow="Typographic Scale"
              title="Editorial Font Pairing"
              subtitle="Cormorant Garamond (high-contrast display serif) paired with Plus Jakarta Sans (warm geometric body)."
            />

            <div className="bg-surface border border-border p-6 sm:p-10 flex flex-col gap-8">
              {/* Display Heading */}
              <div className="flex flex-col gap-1 pb-6 border-b border-border/70">
                <span className="eyebrow">Display • Cormorant Garamond Light</span>
                <p className="font-display font-light text-3xl sm:text-5xl lg:text-6xl tracking-tight text-foreground leading-[1.1]">
                  Sculpted Press-On Couture
                </p>
              </div>

              {/* H1 Heading */}
              <div className="flex flex-col gap-1 pb-6 border-b border-border/70">
                <span className="eyebrow">Heading 1 • Cormorant Garamond</span>
                <h1 className="font-display font-light text-2xl sm:text-4xl text-foreground leading-[1.15]">
                  Individually Hand-Glazed Artistry
                </h1>
              </div>

              {/* H2 Heading */}
              <div className="flex flex-col gap-1 pb-6 border-b border-border/70">
                <span className="eyebrow">Heading 2 • Cormorant Garamond</span>
                <h2 className="font-display font-light text-xl sm:text-3xl text-foreground leading-[1.2]">
                  Custom Sizing Kit & Shape Selection
                </h2>
              </div>

              {/* H3 Heading */}
              <div className="flex flex-col gap-1 pb-6 border-b border-border/70">
                <span className="eyebrow">Heading 3 • Cormorant Garamond Medium</span>
                <h3 className="font-display font-medium text-lg sm:text-2xl text-foreground leading-[1.25]">
                  Salon-Grade Resin • Reusable 5+ Times
                </h3>
              </div>

              {/* Body Copy */}
              <div className="flex flex-col gap-1 pb-6 border-b border-border/70">
                <span className="eyebrow">Body Text • Plus Jakarta Sans</span>
                <p className="text-sm sm:text-base text-foreground/90 font-normal leading-relaxed max-w-2xl">
                  Each set is designed to mimic the natural apex and curvature of custom acrylics without chemical damage.
                  Our artisans individually layer builder gels, metallic chrome foils, and high-gloss top glazes to achieve
                  a finish that endures weeks of daily wear.
                </p>
              </div>

              {/* Small Copy & Eyebrow */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1">
                  <span className="eyebrow">Eyebrow / Overline Token</span>
                  <span className="eyebrow text-accent">
                    NAILS BY FUFS • STUDIO ARCHIVE
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="eyebrow">Small / Micro Text</span>
                  <p className="text-xs text-muted-foreground leading-normal">
                    Includes 24 nails, bespoke prep file, cuticle wand, adhesive tabs, and professional bonding resin.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 3. CORE UI PRIMITIVES */}
          <section id="primitives" className="flex flex-col gap-10">
            <SectionHeading
              eyebrow="UI Components"
              title="Phase 1 Core Primitives"
              subtitle="Buttons, IconButtons, Inputs, Textareas, and SectionHeadings styled with tactile borders and touch targets."
            />

            {/* Buttons Matrix */}
            <div className="flex flex-col gap-4">
              <h3 className="font-display text-xl text-foreground">
                Button Component Variations
              </h3>

              <div className="bg-surface border border-border p-6 sm:p-8 flex flex-col gap-6">
                {/* Variants */}
                <div className="flex flex-col gap-2">
                  <span className="eyebrow">Style Variants</span>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="primary">Primary Action</Button>
                    <Button variant="accent">Accent Terracotta</Button>
                    <Button variant="outline">Hairline Outline</Button>
                    <Button variant="ghost">Ghost Touch</Button>
                    <Button variant="link">Editorial Link</Button>
                  </div>
                </div>

                {/* Sizes */}
                <div className="flex flex-col gap-2 pt-4 border-t border-border/70">
                  <span className="eyebrow">Size Scale (Touch Targets: 36px, 44px, 52px)</span>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="primary" size="sm">Small (36px)</Button>
                    <Button variant="primary" size="md">Medium (44px)</Button>
                    <Button variant="primary" size="lg">Large (52px)</Button>
                  </div>
                </div>

                {/* Interactive States & Icons */}
                <div className="flex flex-col gap-2 pt-4 border-t border-border/70">
                  <span className="eyebrow">Interactive States</span>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      variant="primary"
                      isLoading={buttonLoading}
                      onClick={() => {
                        setButtonLoading(true);
                        setTimeout(() => setButtonLoading(false), 1500);
                      }}
                    >
                      {buttonLoading ? "Loading..." : "Click to Test Loading"}
                    </Button>
                    <Button variant="primary" disabled>Disabled State</Button>
                    <Button
                      variant="outline"
                      leftIcon={<Sparkles className="h-3.5 w-3.5 text-accent" />}
                    >
                      With Left Icon
                    </Button>
                    <Button
                      variant="primary"
                      rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                    >
                      With Right Arrow
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Icon Buttons Matrix */}
            <div className="flex flex-col gap-4">
              <h3 className="font-display text-xl text-foreground">
                Accessible Icon Buttons
              </h3>

              <div className="bg-surface border border-border p-6 sm:p-8 flex flex-col gap-4">
                <span className="eyebrow">Variants (With Enforced aria-label & 44px touch targets)</span>
                <div className="flex flex-wrap items-center gap-4">
                  <IconButton aria-label="Shopping Bag" variant="ghost" size="md">
                    <ShoppingBag className="h-5 w-5" />
                  </IconButton>
                  <IconButton aria-label="Add to Wishlist" variant="outline" size="md">
                    <Heart className="h-5 w-5" />
                  </IconButton>
                  <IconButton aria-label="Search Lookbook" variant="filled" size="md">
                    <Search className="h-5 w-5" />
                  </IconButton>
                  <IconButton aria-label="Sparkle Accent" variant="accent" size="md">
                    <Sparkles className="h-5 w-5" />
                  </IconButton>
                </div>
              </div>
            </div>

            {/* Form Controls: Input & Textarea */}
            <div className="flex flex-col gap-4">
              <h3 className="font-display text-xl text-foreground">
                Form Inputs & Editorial Controls
              </h3>

              <div className="bg-surface border border-border p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Client Full Name"
                  placeholder="e.g. Camille Laurent"
                  helperText="Required for custom sizing records"
                />

                <Input
                  label="Email Address"
                  type="email"
                  placeholder="hello@nailsbyfufs.com"
                  leftIcon={<Search className="h-4 w-4" />}
                  helperText="We send private release notices only"
                />

                <Input
                  label="Custom Nail Width (Thumb)"
                  placeholder="16.5 mm"
                  error="Please enter a valid millimeter measurement (10 - 22 mm)"
                  defaultValue="Invalid"
                />

                <Input
                  label="Disabled Input Example"
                  placeholder="Reserved for studio members"
                  disabled
                  defaultValue="Tier: Private Collector"
                />

                <div className="md:col-span-2">
                  <Textarea
                    label="Bespoke Sizing & Design Notes"
                    placeholder="Provide your specific nail bed preferences, apex preference (flat or high arch), or custom length requests..."
                    rows={3}
                    helperText="Our artisans review every submission individually."
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 4. IMAGE & MEDIA SYSTEM */}
          <section id="media" className="flex flex-col gap-8">
            <SectionHeading
              eyebrow="Media System"
              title="Aspect Ratios & Editorial Placeholders"
              subtitle="Standardized for press-on nail photography with corner architectural crosshairs, subtle hover, and responsive crops."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* 1:1 Square */}
              <div className="flex flex-col gap-2">
                <Media
                  alt="Square Product Grid Placeholder"
                  ratio="square"
                  placeholderLabel="Product Grid"
                  placeholderSublabel="1:1 • SQUARE"
                  interactive
                />
                <span className="text-xs font-medium text-foreground">1:1 Square (Shop Grid)</span>
              </div>

              {/* 4:5 Portrait */}
              <div className="flex flex-col gap-2">
                <Media
                  alt="Portrait Nail Macro Placeholder"
                  ratio="portrait"
                  placeholderLabel="Hand Model Macro"
                  placeholderSublabel="4:5 • PORTRAIT"
                  interactive
                />
                <span className="text-xs font-medium text-foreground">4:5 Portrait (Press-On Macro)</span>
              </div>

              {/* 3:2 Classic */}
              <div className="flex flex-col gap-2">
                <Media
                  alt="Classic Lookbook Placeholder"
                  ratio="classic"
                  placeholderLabel="Editorial Spread"
                  placeholderSublabel="3:2 • EDITORIAL"
                  interactive
                />
                <span className="text-xs font-medium text-foreground">3:2 Classic (Lookbook)</span>
              </div>

              {/* 16:9 Wide */}
              <div className="flex flex-col gap-2">
                <Media
                  alt="Wide Hero Banner Placeholder"
                  ratio="wide"
                  placeholderLabel="Studio Panoramic"
                  placeholderSublabel="16:9 • LANDSCAPE"
                  interactive
                />
                <span className="text-xs font-medium text-foreground">16:9 Landscape (Hero Banner)</span>
              </div>
            </div>
          </section>

          {/* Verification Checklist */}
          <section className="p-8 bg-surface-subtle border border-border flex flex-col gap-4">
            <span className="eyebrow text-accent">Phase 1 Quality Checklist</span>
            <h3 className="font-display text-2xl text-foreground">
              Visual Foundation Status
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs text-foreground/90">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-700" />
                <span>Centralized CSS design tokens in globals.css</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-700" />
                <span>Cormorant Garamond + Plus Jakarta Sans fonts</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-700" />
                <span>Mobile touch targets &ge; 44px</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-700" />
                <span>Tactile hairline borders (no heavy SaaS shadows)</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-700" />
                <span>Responsive Container (320px to 1400px)</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-700" />
                <span>Minimal Prisma & Supabase setup ready for Phase 2</span>
              </div>
            </div>
          </section>
        </Container>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-surface">
        <Container size="wide" className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>Nails by Fufs Internal Design System</span>
          <Link href="/" className="text-accent hover:text-accent-hover">
            Return to Storefront Placeholder &rarr;
          </Link>
        </Container>
      </footer>
    </div>
  );
}
