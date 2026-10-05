import type { Metadata } from "next";

import { Shell } from "@/components/layout/Shell";
import { StudioBoundary } from "@/components/studio/StudioBoundary";
import { getStorefrontCatalogue } from "@/lib/catalogue-server";
import { getSiteContent } from "@/lib/site-content";
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
 * from a cached catalogue and cached content instead of issuing queries to another
 * region, which is what took the route's time-to-first-byte from ~385 ms to ~11 ms.
 *
 * Every section below is a pure presentation component that receives its content
 * as props. They are fetched once here rather than inside each section so that one
 * request performs one content read, and so the sections stay synchronous and
 * trivially testable.
 */

/**
 * Page metadata is derived from the identity document, so the owner can change the
 * site's title and description without a deploy. `title` is deliberately the
 * identity's `metaTitle` rather than a fixed string — the homepage previously
 * carried a *third* hardcoded title that matched neither `siteConfig.description`
 * nor the root layout's, and collapsing them removes that drift.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { identity } = await getSiteContent();
  return {
    title: identity.homeMetaTitle,
    description: identity.homeMetaDescription,
  };
}

export default async function HomePage() {
  const [{ products, collections }, content] = await Promise.all([
    getStorefrontCatalogue(),
    getSiteContent(),
  ]);

  return (
    <StudioBoundary products={products} collections={collections}>
      <Shell>
        <Hero content={content.home.hero} />
        <FeaturedCollection content={content.home.featuredCollection} />
        <ProductPreview products={products} content={content.home.productPreview} />
        <CustomFeature content={content.home.customFeature} />
        <HowItWorksPreview content={content.home.howItWorks} />
        <EditorialGallery content={content.home.gallery} />
        <FinalCTA content={content.home.finalCta} />
        <NewsletterSection content={content.home.newsletter} contact={content.contact} />
      </Shell>
    </StudioBoundary>
  );
}
