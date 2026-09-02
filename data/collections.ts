export interface Collection {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  tag?: string;
  featured: boolean;
  imagePlaceholder: {
    label: string;
    sublabel: string;
    alt: string;
  };
  productCountPlaceholder?: string;
}

export const collections: Collection[] = [
  {
    slug: "core-edit",
    title: "The Core Edit",
    subtitle: "Everyday Neutrals & Sheer Finishes",
    description:
      "A timeless series of understated glazed tones, milky neutrals, and delicate pearl sheers designed for seamless daily wear.",
    tag: "Core Release",
    featured: true,
    imagePlaceholder: {
      label: "The Core Edit Lookbook",
      sublabel: "16:9 • COLLECTION ARCHIVE",
      alt: "The Core Edit lookbook visual presentation",
    },
    productCountPlaceholder: "4 Selected Sets",
  },
  {
    slug: "season-01",
    title: "Season 01 — Cherry & Velvet",
    subtitle: "Deep Wine Hues & Tactile Finishes",
    description:
      "Rich burgundy palettes, chrome accents, and romantic studio designs inspired by Fatima's signature nail art.",
    tag: "Seasonal Edit",
    featured: true,
    imagePlaceholder: {
      label: "Season 01 Lookbook",
      sublabel: "4:5 • EDITORIAL ARCHIVE",
      alt: "Season 01 Cherry and Velvet nail lookbook",
    },
    productCountPlaceholder: "3 Selected Sets",
  },
  {
    slug: "raw-earth",
    title: "Raw Earth Series",
    subtitle: "Warm Terracotta & Grounded Matte",
    description:
      "Warm clay tones, satin textures, and sculpted organic shapes designed for relaxed warmth and tactile comfort.",
    tag: "Studio Series",
    featured: false,
    imagePlaceholder: {
      label: "Raw Earth Series Lookbook",
      sublabel: "3:2 • STUDIO ARCHIVE",
      alt: "Raw Earth Series nail set visual",
    },
    productCountPlaceholder: "2 Selected Sets",
  },
];

export function getCollectionBySlug(slug: string): Collection | undefined {
  return collections.find((c) => c.slug === slug);
}
