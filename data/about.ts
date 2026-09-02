export interface AboutSectionPoint {
  title: string;
  description: string;
}

export const aboutHero = {
  eyebrow: "Behind the Studio",
  title: "Made by Fufs.",
  description:
    "An independent nail studio creating thoughtful, handcrafted press-on sets designed for personal expression and gentle wear.",
  imagePlaceholder: {
    label: "Fatima • Studio Portrait",
    sublabel: "4:5 • ARTIST ARCHIVE",
    alt: "Fatima, independent artist behind Nails by Fufs",
  },
};

export const aboutStory = {
  eyebrow: "The Studio Story",
  title: "A personal approach to nail artistry.",
  paragraphs: [
    "Nails by Fufs began from a love for intentional nail design and the freedom of wearing salon-aesthetic nails on your own schedule.",
    "Every set is individually shaped, painted, and finished in small studio batches. Rather than mass-produced tips, each piece is crafted with attention to clean edges, natural cuticle curves, and durable finishes.",
    "Whether you're looking for an understated everyday glaze or a bold bespoke concept for a special occasion, our sets are made to feel personal, comfortable, and reusable.",
  ],
};

export const aboutPhilosophy: AboutSectionPoint[] = [
  {
    title: "Hand-Finished Care",
    description:
      "Individually detailed with high-grade gel coats and sealed for lasting shine and protection.",
  },
  {
    title: "Thoughtful Aesthetics",
    description:
      "A curated palette of deep cherry wines, sheer milky glazes, tactile velvets, and soft blush tones.",
  },
  {
    title: "Gentle & Reusable",
    description:
      "Designed for damage-free wear with easy warm water removal and reusable presentation storage.",
  },
];

export const studioVisual = {
  label: "Studio Workspace & Detail",
  sublabel: "16:9 • WORKSPACE ARCHIVE",
  alt: "Close-up of studio workspace, detail brushes, and nail art finishes",
};

export const aboutCta = {
  eyebrow: "Explore the Work",
  title: "Find a set made for your mood.",
  description:
    "Explore our current ready-to-wear series or commission a custom set created directly with Fatima.",
  primaryCta: { label: "Explore Collection", href: "/shop" },
  secondaryCta: { label: "Commission Custom Set", href: "/custom" },
};
