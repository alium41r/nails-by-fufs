# Project Brain: Nails by Fufs

> **Canonical Source of Truth**: This document records the core identity, strategy, constraints, and architecture for Nails by Fufs.

---

## Project Metadata
- **Last Updated**: `2026-09-02`
- **Updated By**: `Antigravity AI Agent`
- **Current Phase**: `MVP Development (Phase 2E Shopping Bag Experience Complete)`

---

## 0. Template Defaults vs. Project-Specific Decisions
- **Project Tier**: `T4 E-Commerce Storefront — Independent Handcrafted Press-On Nail Studio`
- **Baseline Template Defaults**: Next.js App Router, TypeScript, Tailwind CSS.
- **Active Capabilities**:
  - Storefront UX & Editorial Catalog: **Active**
  - Custom Sizing & Bespoke Request Forms: **Active**
  - Global Studio Search & Discovery: **Active**
  - Shopping Bag State & Local Persistence: **Active**
  - Database & Auth: **Dormant during Phase 1 Prototype / Early Frontend Stages**
- **Architectural Scope**: Frontend-first luxury brand experience, editorial aesthetics, high-conversion mobile-first UX.

---

## 1. Product Identity
- **Product Name**: `Nails by Fufs`
- **Tagline**: `Press-ons, made personal.`
- **Product Category**: `Luxury Handcrafted Press-On Nails & Bespoke Nail Art`
- **Elevator Pitch**:
  > An independent nail studio creating salon-quality, custom-fit, and small-batch press-on nails that empower clients to achieve high-end nail artistry without salon appointments.

---

## 2. Problem Statement
- **Core Problem**: Salon acrylics and gel extensions are time-consuming, expensive, and damaging to natural nails, while mass-market drugstore press-ons feel flimsy, ill-fitting, and generic.
- **Our Solution**: Handcrafted, durable, artist-designed press-on sets with bespoke sizing kits and custom design commissions.

---

## 3. Target Users
- **Primary Persona**: Beauty-conscious professionals and nail art enthusiasts who want salon-quality aesthetics on flexible schedules.
- **Secondary Persona**: Event and bridal clients commissioning bespoke matching nail sets.

---

## 4. User Needs & Jobs to Be Done (JTBD)
- **Core Job**: "When I have a special event or need elevated everyday nails, I want a flawless custom set that fits perfectly and applies easily in minutes."

---

## 5. Value Proposition & Key Differentiators
- **Artist-Handcrafted**: Each set designed and finished by independent nail artist Fufs.
- **Reusable & Gentle**: High-grade durability with reusable application methods.
- **Complimentary Bespoke Sizing**: Guaranteed fit with custom sizing kits.

---

## 6. Product Goals & Metrics
- **Phase 1C Goal**: Deliver a calm, welcoming, quiet luxury homepage with diverse section rhythms (Hero, Featured Collection, Shop Preview, Custom Feature, How It Works, Visual Archive, Final CTA, Newsletter), baby pink / deep burgundy palette, and responsive mobile perfection.
- **Phase 2D Goal**: Refine the catalog browsing (`/shop`), interactive global search (desktop header popover + mobile drawer search), and dedicated query results experience (`/search`) with deterministic multi-token filtering and curated discovery terms.
- **Phase 2E Goal**: Implement a calm, editorial client-side shopping bag experience (`/cart`) with deterministic configuration line items, quantity controls, local persistence, real-time header count badge, and non-functional checkout placeholder.

---

## 7. Non-Goals (Explicitly Out of Scope)
- Inventing fake user reviews, customer counts, or unverified claims.
- Marketing clichés ("Elevate your beauty", "Redefining beauty", etc.).
- Complex backend checkout before the UI lookbook and cart architecture are validated.

---

## 8. Business Model & Monetization
- Direct-to-consumer sales of core collections, seasonal drops, and bespoke custom commissions.

---

## 9. Brand & Design Direction
- **Brand Personality**: Quiet luxury, feminine, editorial, personal, artistic, approachable.
- **Design Archetype**: Editorial minimalism & indie beauty studio (inspired by @nailsbyfufs Instagram aesthetic: baby pink blush, deep cherry burgundy, warm cream foundation, clean dark neutrals).
- **Visual Principles**:
  - **Typography**: Display: *Cormorant Garamond* (light, elegant serif). Body: *Plus Jakarta Sans* (clean geometric sans).
  - **Color Palette**: Default theme is Dark (deep espresso `#171214`, luminous rose `#E8829C`, muted berry `#311620`), with interactive toggle switching to Light (soft cashmere rose `#FCEEF2`, luminous pearl blush `#FFF7F9`, deep cherry burgundy `#942948`, soft petal pink `#FBDCE7`).
  - **Imagery**: Dominant 4:5 portrait, 16:9 lookbook, and 3:2 bespoke framing with tactile placeholder architecture.

---

## 10. Important Constraints
- **Zero Hallucinated Claims**: Factual boundaries strictly enforced across copy.
- **Responsive Strictness**: Zero horizontal overflow from 320px to 1440px+.
- **Accessibility**: Minimum 44x44px touch targets, WCAG AA contrast on all text and controls.

---

## 11. Current Project State
- **Current Phase**: `MVP Development (Phase 2E Shopping Bag Experience Complete)`
- **Active Focus**: Storefront shopping bag, configuration management, local persistence, and checkout placeholder.
- **Recent Milestones**:
  - Phase 1A/1B foundational layout shell and theme architecture.
  - Phase 1C customer-facing homepage composition.
  - Phase 2A shopping experience: Catalog browsing (`/shop`), lookbook collections (`/collections`), collection dynamic detail (`/collections/[slug]`), and product detail experience (`/product/[slug]`).
  - Phase 2B-1 custom order frontend: Bespoke commission request page (`/custom`).
  - Phase 2B-2 visual guide: Editorial 4-step process guide (`/how-it-works`).
  - Phase 2B-3 fitting guide: Visual size & measurement guide (`/size-guide`).
  - Phase 2C-1 brand storytelling & support: Artist studio story (`/about`), accessible scannable accordion support (`/faq`), and quiet inquiry contact form (`/contact`).
  - Phase 2D shop and search experience: Refined `/shop` with URL-synced multi-axis filtering, lightweight header search popover, mobile drawer search, dedicated `/search` page, and pure deterministic search utility.
  - Phase 2E shopping bag experience: Functional client-side cart provider (`CartProvider.tsx`) with `useSyncExternalStore` and `localStorage` persistence, "Add to Bag" interaction on `ProductOptions.tsx`, real-time header count badge, and dedicated editorial `/cart` bag page with quantity stepper, line removal, subtotal placeholder (`$XX`), and calm empty bag state.

---

## 12. Key Technical Assumptions & Stack Decisions
- **Framework**: Next.js App Router (React 19 / Next.js 15+)
- **Styling**: Tailwind CSS with semantic CSS custom properties in `app/globals.css`.
- **Icons**: Lucide React vector icons.
- **State & Theming**: Next-themes SSR-safe hydration provider.
