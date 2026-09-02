import { PlaceholderProduct, placeholderProducts } from "./placeholder-products";

export interface HeroContent {
  eyebrow: string;
  headline: string;
  headlineAccent: string;
  description: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  imagePlaceholder: {
    label: string;
    sublabel: string;
    alt: string;
  };
}

export interface FeaturedCollectionContent {
  eyebrow: string;
  title: string;
  description: string;
  cta: { label: string; href: string };
  imagePlaceholder: {
    label: string;
    sublabel: string;
    alt: string;
  };
}

export interface CustomFeatureContent {
  eyebrow: string;
  title: string;
  description: string;
  cta: { label: string; href: string };
  imagePlaceholder: {
    label: string;
    sublabel: string;
    alt: string;
  };
}

export interface CraftsmanshipContent {
  eyebrow: string;
  title: string;
  paragraphs: string[];
  details: { label: string; text: string }[];
  imagePlaceholder: {
    label: string;
    sublabel: string;
    alt: string;
  };
}

export interface ProcessStep {
  number: string;
  title: string;
  description: string;
}

export interface GalleryItem {
  id: string;
  ratio: "portrait" | "square" | "classic" | "wide";
  label: string;
  sublabel: string;
  alt: string;
  className?: string;
}

export const heroContent: HeroContent = {
  eyebrow: "Handmade Press-On Nails",
  headline: "Press-ons,",
  headlineAccent: "made personal.",
  description:
    "Created by independent nail artist Fufs. Thoughtfully designed sets for easy wear and your own personal style.",
  primaryCta: { label: "Shop Nails", href: "/shop" },
  secondaryCta: { label: "Custom Orders", href: "/custom" },
  imagePlaceholder: {
    label: "Featured Hand Editorial",
    sublabel: "4:5 • HERO PHOTOGRAPHY",
    alt: "Nails by Fufs hero set presentation",
  },
};

export const featuredCollectionContent: FeaturedCollectionContent = {
  eyebrow: "Featured Collection",
  title: "The Current Edit",
  description:
    "A small seasonal series of finishes, shapes, and palettes created by Fufs.",
  cta: { label: "Explore Collection", href: "/collections" },
  imagePlaceholder: {
    label: "Current Edit Lookbook",
    sublabel: "16:9 • COLLECTION VISUAL",
    alt: "Featured collection editorial presentation",
  },
};

export type PreviewProduct = PlaceholderProduct;
export const previewProducts: PreviewProduct[] = placeholderProducts;

export const customFeatureContent: CustomFeatureContent = {
  eyebrow: "Bespoke Requests",
  title: "Made for your mood.",
  description:
    "Have a specific concept, colorway, or event in mind? Work directly with Fufs to create a set tailored to your preferences.",
  cta: { label: "Request Custom Set", href: "/custom" },
  imagePlaceholder: {
    label: "Custom Commission Archive",
    sublabel: "3:2 • BESPOKE ARCHIVE",
    alt: "Custom commission nail design archive",
  },
};

export const craftsmanshipContent: CraftsmanshipContent = {
  eyebrow: "About The Craft",
  title: "Designed & Finished by Hand",
  paragraphs: [
    "Every set from Nails by Fufs is produced in small batches by an independent artist, with attention to shape, balance, and clean details.",
    "Designed to give you polished nails whenever you want them, without a salon appointment.",
  ],
  details: [
    { label: "Artist-Led", text: "Individually created and packaged" },
    { label: "Made for Wear", text: "Simple application at your own pace" },
  ],
  imagePlaceholder: {
    label: "Studio & Process",
    sublabel: "4:5 • PROCESS DETAIL",
    alt: "Artist workspace and finishing process",
  },
};

export const howItWorksContent = {
  eyebrow: "The Process",
  title: "Simple & Reusable",
  description: "Designed for simple application at your own pace.",
};

export const processSteps: ProcessStep[] = [
  {
    number: "01",
    title: "Choose",
    description: "Pick from seasonal releases or request a custom set.",
  },
  {
    number: "02",
    title: "Size",
    description: "Find your measurements for a comfortable fit.",
  },
  {
    number: "03",
    title: "Apply",
    description: "Attach in minutes with tabs or nail glue.",
  },
  {
    number: "04",
    title: "Wear",
    description: "Enjoy polished nails whenever you need them.",
  },
];

export const galleryItems: GalleryItem[] = [
  {
    id: "gallery-1",
    ratio: "portrait",
    label: "Hand Lookbook 01",
    sublabel: "4:5 • CLOSE LOOK",
    alt: "Hand editorial nail look",
  },
  {
    id: "gallery-2",
    ratio: "square",
    label: "Texture & Detail",
    sublabel: "1:1 • MACRO FOCUS",
    alt: "Nail finish and texture detail",
  },
  {
    id: "gallery-3",
    ratio: "square",
    label: "Packaging & Care",
    sublabel: "1:1 • FLAT LAY",
    alt: "Set packaging and prep items",
  },
  {
    id: "gallery-4",
    ratio: "portrait",
    label: "Hand Lookbook 02",
    sublabel: "4:5 • EDITORIAL",
    alt: "Alternative editorial nail angle",
  },
];

export const finalCtaContent = {
  eyebrow: "Nails by Fufs",
  title: "Ready for your next set?",
  description: "Explore available sets or reach out for custom work.",
  primaryCta: { label: "Shop Nails", href: "/shop" },
  secondaryCta: { label: "Custom Orders", href: "/custom" },
};

export const newsletterContent = {
  eyebrow: "Studio Updates",
  title: "Release Announcements",
  description:
    "Receive occasional updates when new sets or custom commission slots open.",
};
