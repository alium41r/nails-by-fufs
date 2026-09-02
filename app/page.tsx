import type { Metadata } from "next";
import { Shell } from "@/components/layout/Shell";
import { Hero } from "@/components/sections/Hero";
import { FeaturedCollection } from "@/components/sections/FeaturedCollection";
import { ProductPreview } from "@/components/sections/ProductPreview";
import { CustomFeature } from "@/components/sections/CustomFeature";
import { HowItWorksPreview } from "@/components/sections/HowItWorksPreview";
import { EditorialGallery } from "@/components/sections/EditorialGallery";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { NewsletterSection } from "@/components/sections/NewsletterSection";

export const metadata: Metadata = {
  title: "Nails by Fufs — Handcrafted Press-On Nails & Custom Sets",
  description:
    "Independent press-on nail studio by Fufs. Browse seasonal sets or commission custom handcrafted nail designs.",
};

export default function HomePage() {
  return (
    <Shell>
      <Hero />
      <FeaturedCollection />
      <ProductPreview />
      <CustomFeature />
      <HowItWorksPreview />
      <EditorialGallery />
      <FinalCTA />
      <NewsletterSection />
    </Shell>
  );
}
