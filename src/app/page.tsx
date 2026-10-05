import type { Metadata } from "next";
import { Shell } from "@/components/layout/Shell";
import { StudioBoundary } from "@/components/studio/StudioBoundary";
import { getStorefrontCatalogue } from "@/lib/catalogue-server";
import { Hero } from "@/components/sections/Hero";
import { FeaturedCollection } from "@/components/sections/FeaturedCollection";
import { ProductPreview } from "@/components/sections/ProductPreview";
import { CustomFeature } from "@/components/sections/CustomFeature";
import { HowItWorksPreview } from "@/components/sections/HowItWorksPreview";
import { EditorialGallery } from "@/components/sections/EditorialGallery";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { NewsletterSection } from "@/components/sections/NewsletterSection";

/*
 * `force-dynamic` is no longer needed here.
 *
 * It existed because the catalogue read was request-scoped: re-rendering on every
 * request was the only way to show a live catalogue. That read is now cached across
 * requests and expired by `invalidateCatalogue()` on every catalogue write, so
 * freshness is event-driven rather than a property of the route's render mode.
 *
 * The route still renders dynamically, and deliberately so — `<StudioBoundary>`
 * checks the admin session through `cookies()` on every page, which is inherently
 * request-time work. What changed is the *cost* of that render: it now assembles
 * from a cached catalogue instead of issuing three database queries to another
 * region, which is what took the route's time-to-first-byte from ~385 ms to ~11 ms.
 */

export const metadata: Metadata = {
  title: "Nails by Fufs — Handcrafted Press-On Nails & Custom Sets",
  description:
    "Independent press-on nail studio by Fufs. Browse seasonal sets or commission custom handcrafted nail designs.",
};

export default async function HomePage() {
  const { products, collections } = await getStorefrontCatalogue();

  return (
    <StudioBoundary products={products} collections={collections}>
      <Shell>
        <Hero />
        <FeaturedCollection />
        <ProductPreview products={products} />
        <CustomFeature />
        <HowItWorksPreview />
        <EditorialGallery />
        <FinalCTA />
        <NewsletterSection />
      </Shell>
    </StudioBoundary>
  );
}
