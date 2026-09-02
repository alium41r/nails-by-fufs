export interface ProductImage {
  id: string;
  label: string;
  sublabel: string;
  alt: string;
  ratio: "portrait" | "square" | "classic";
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  descriptor: string;
  price: string;
  tag?: string;
  collectionSlug: string;
  collectionName: string;
  shape: string;
  length: "Short" | "Medium" | "Long";
  finish: string;
  description: string;
  included: string[];
  images: ProductImage[];
  imagePlaceholder: {
    label: string;
    sublabel: string;
    alt: string;
  };
}

export const products: Product[] = [
  {
    id: "glazed-truffle",
    slug: "glazed-truffle",
    name: "Glazed Truffle",
    descriptor: "Almond • Soft Gloss Finish",
    price: "$XX",
    tag: "New",
    collectionSlug: "core-edit",
    collectionName: "The Core Edit",
    shape: "Almond",
    length: "Medium",
    finish: "Soft Gloss",
    description:
      "A rich, creamy taupe glaze with a soft reflective finish. Designed for understated elegance and versatile everyday wear.",
    included: [
      "10 custom-fit press-on nails",
      "Full prep kit (nail buffer, cuticle stick, prep wipe)",
      "Adhesive tabs and salon-grade nail glue",
      "Complimentary bespoke sizing card",
    ],
    imagePlaceholder: {
      label: "Glazed Truffle Set",
      sublabel: "4:5 • PRODUCT SHOT",
      alt: "Glazed Truffle press-on nail set",
    },
    images: [
      {
        id: "img-1",
        label: "Glazed Truffle Set",
        sublabel: "4:5 • PRIMARY ANGLE",
        alt: "Glazed Truffle primary nail set presentation",
        ratio: "portrait",
      },
      {
        id: "img-2",
        label: "Hand Editorial Focus",
        sublabel: "4:5 • WEAR SAMPLE",
        alt: "Glazed Truffle worn on hand editorial preview",
        ratio: "portrait",
      },
      {
        id: "img-3",
        label: "Glaze & Texture Macro",
        sublabel: "1:1 • MACRO SHOT",
        alt: "Close-up macro detail of glazed nail finish",
        ratio: "square",
      },
      {
        id: "img-4",
        label: "Studio Packaging View",
        sublabel: "1:1 • PACKAGING",
        alt: "Nails by Fufs studio packaging and set kit",
        ratio: "square",
      },
    ],
  },
  {
    id: "alabaster-aura",
    slug: "alabaster-aura",
    name: "Alabaster Aura",
    descriptor: "Short Square • Sheer Pearl",
    price: "$XX",
    tag: "Featured",
    collectionSlug: "core-edit",
    collectionName: "The Core Edit",
    shape: "Short Square",
    length: "Short",
    finish: "Sheer Pearl",
    description:
      "A delicate, translucent milky base infused with micro-pearl iridescence. Subtle, clean, and effortlessly polished.",
    included: [
      "10 custom-fit press-on nails",
      "Full prep kit (nail buffer, cuticle stick, prep wipe)",
      "Adhesive tabs and salon-grade nail glue",
      "Complimentary bespoke sizing card",
    ],
    imagePlaceholder: {
      label: "Alabaster Aura Set",
      sublabel: "4:5 • PRODUCT SHOT",
      alt: "Alabaster Aura press-on nail set",
    },
    images: [
      {
        id: "img-1",
        label: "Alabaster Aura Set",
        sublabel: "4:5 • PRIMARY ANGLE",
        alt: "Alabaster Aura primary nail set presentation",
        ratio: "portrait",
      },
      {
        id: "img-2",
        label: "Hand Editorial Focus",
        sublabel: "4:5 • WEAR SAMPLE",
        alt: "Alabaster Aura worn on hand editorial preview",
        ratio: "portrait",
      },
      {
        id: "img-3",
        label: "Pearl Iridescence Macro",
        sublabel: "1:1 • MACRO SHOT",
        alt: "Close-up macro detail of sheer pearl iridescence",
        ratio: "square",
      },
    ],
  },
  {
    id: "smoked-quartz",
    slug: "smoked-quartz",
    name: "Smoked Quartz",
    descriptor: "Stiletto • Velvet Texture",
    price: "$XX",
    collectionSlug: "season-01",
    collectionName: "Season 01 — Cherry & Velvet",
    shape: "Stiletto",
    length: "Long",
    finish: "Velvet Texture",
    description:
      "A deep smoky charcoal-plum base with tactile velvet magnetic dimension. Dramatic, moody, and sculpted.",
    included: [
      "10 custom-fit press-on nails",
      "Full prep kit (nail buffer, cuticle stick, prep wipe)",
      "Adhesive tabs and salon-grade nail glue",
      "Complimentary bespoke sizing card",
    ],
    imagePlaceholder: {
      label: "Smoked Quartz Set",
      sublabel: "4:5 • PRODUCT SHOT",
      alt: "Smoked Quartz press-on nail set",
    },
    images: [
      {
        id: "img-1",
        label: "Smoked Quartz Set",
        sublabel: "4:5 • PRIMARY ANGLE",
        alt: "Smoked Quartz primary nail set presentation",
        ratio: "portrait",
      },
      {
        id: "img-2",
        label: "Magnetic Velvet Reflection",
        sublabel: "1:1 • TEXTURE DETAIL",
        alt: "Close-up detail of magnetic velvet texture",
        ratio: "square",
      },
    ],
  },
  {
    id: "raw-terracotta",
    slug: "raw-terracotta",
    name: "Raw Terracotta",
    descriptor: "Oval • Warm Matte",
    price: "$XX",
    collectionSlug: "raw-earth",
    collectionName: "Raw Earth Series",
    shape: "Oval",
    length: "Medium",
    finish: "Warm Matte",
    description:
      "Warm sun-baked clay tones with a velvety smooth matte seal. Grounded, organic, and beautifully modern.",
    included: [
      "10 custom-fit press-on nails",
      "Full prep kit (nail buffer, cuticle stick, prep wipe)",
      "Adhesive tabs and salon-grade nail glue",
      "Complimentary bespoke sizing card",
    ],
    imagePlaceholder: {
      label: "Raw Terracotta Set",
      sublabel: "4:5 • PRODUCT SHOT",
      alt: "Raw Terracotta press-on nail set",
    },
    images: [
      {
        id: "img-1",
        label: "Raw Terracotta Set",
        sublabel: "4:5 • PRIMARY ANGLE",
        alt: "Raw Terracotta primary nail set presentation",
        ratio: "portrait",
      },
      {
        id: "img-2",
        label: "Matte Finish & Oval Shape",
        sublabel: "4:5 • WEAR SAMPLE",
        alt: "Raw Terracotta on hand view",
        ratio: "portrait",
      },
    ],
  },
  {
    id: "cherry-glaze",
    slug: "cherry-glaze",
    name: "Cherry Glaze",
    descriptor: "Almond • Deep Wine Gloss",
    price: "$XX",
    tag: "Seasonal",
    collectionSlug: "season-01",
    collectionName: "Season 01 — Cherry & Velvet",
    shape: "Almond",
    length: "Medium",
    finish: "Deep Wine Gloss",
    description:
      "A deep, romantic black-cherry syrup wash with a mirror-glass topcoat. Inspired by Fatima's signature studio nail art.",
    included: [
      "10 custom-fit press-on nails",
      "Full prep kit (nail buffer, cuticle stick, prep wipe)",
      "Adhesive tabs and salon-grade nail glue",
      "Complimentary bespoke sizing card",
    ],
    imagePlaceholder: {
      label: "Cherry Glaze Set",
      sublabel: "4:5 • PRODUCT SHOT",
      alt: "Cherry Glaze press-on nail set",
    },
    images: [
      {
        id: "img-1",
        label: "Cherry Glaze Set",
        sublabel: "4:5 • PRIMARY ANGLE",
        alt: "Cherry Glaze primary nail set presentation",
        ratio: "portrait",
      },
      {
        id: "img-2",
        label: "Syrup Depth Macro",
        sublabel: "1:1 • MACRO SHOT",
        alt: "Close-up macro detail of cherry syrup glaze",
        ratio: "square",
      },
    ],
  },
  {
    id: "blush-chrome",
    slug: "blush-chrome",
    name: "Blush Chrome",
    descriptor: "Short Almond • Mirror Chrome",
    price: "$XX",
    tag: "New",
    collectionSlug: "core-edit",
    collectionName: "The Core Edit",
    shape: "Almond",
    length: "Short",
    finish: "Mirror Chrome",
    description:
      "A soft baby pink base glazed with ultra-fine rose chrome powder. Luminous, playful, and chic in every light.",
    included: [
      "10 custom-fit press-on nails",
      "Full prep kit (nail buffer, cuticle stick, prep wipe)",
      "Adhesive tabs and salon-grade nail glue",
      "Complimentary bespoke sizing card",
    ],
    imagePlaceholder: {
      label: "Blush Chrome Set",
      sublabel: "4:5 • PRODUCT SHOT",
      alt: "Blush Chrome press-on nail set",
    },
    images: [
      {
        id: "img-1",
        label: "Blush Chrome Set",
        sublabel: "4:5 • PRIMARY ANGLE",
        alt: "Blush Chrome primary nail set presentation",
        ratio: "portrait",
      },
      {
        id: "img-2",
        label: "Chrome Highlight Reflection",
        sublabel: "1:1 • MACRO SHOT",
        alt: "Close-up macro detail of rose chrome powder",
        ratio: "square",
      },
    ],
  },
  {
    id: "espresso-french",
    slug: "espresso-french",
    name: "Espresso French",
    descriptor: "Short Square • Micro-French",
    price: "$XX",
    collectionSlug: "core-edit",
    collectionName: "The Core Edit",
    shape: "Short Square",
    length: "Short",
    finish: "Micro-French",
    description:
      "A sheer nude base framed by an ultra-thin deep espresso smile line. A contemporary, minimalist take on the classic French manicure.",
    included: [
      "10 custom-fit press-on nails",
      "Full prep kit (nail buffer, cuticle stick, prep wipe)",
      "Adhesive tabs and salon-grade nail glue",
      "Complimentary bespoke sizing card",
    ],
    imagePlaceholder: {
      label: "Espresso French Set",
      sublabel: "4:5 • PRODUCT SHOT",
      alt: "Espresso French press-on nail set",
    },
    images: [
      {
        id: "img-1",
        label: "Espresso French Set",
        sublabel: "4:5 • PRIMARY ANGLE",
        alt: "Espresso French primary nail set presentation",
        ratio: "portrait",
      },
    ],
  },
  {
    id: "opaline-petal",
    slug: "opaline-petal",
    name: "Opaline Petal",
    descriptor: "Oval • Iridescent Sheer",
    price: "$XX",
    collectionSlug: "season-01",
    collectionName: "Season 01 — Cherry & Velvet",
    shape: "Oval",
    length: "Medium",
    finish: "Iridescent Sheer",
    description:
      "Subtle blush petals infused with crystalline opal shifts that catch the light with every hand movement.",
    included: [
      "10 custom-fit press-on nails",
      "Full prep kit (nail buffer, cuticle stick, prep wipe)",
      "Adhesive tabs and salon-grade nail glue",
      "Complimentary bespoke sizing card",
    ],
    imagePlaceholder: {
      label: "Opaline Petal Set",
      sublabel: "4:5 • PRODUCT SHOT",
      alt: "Opaline Petal press-on nail set",
    },
    images: [
      {
        id: "img-1",
        label: "Opaline Petal Set",
        sublabel: "4:5 • PRIMARY ANGLE",
        alt: "Opaline Petal primary nail set presentation",
        ratio: "portrait",
      },
    ],
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductsByCollection(collectionSlug: string): Product[] {
  return products.filter((p) => p.collectionSlug === collectionSlug);
}

export function getRelatedProducts(currentSlug: string, limit = 4): Product[] {
  const current = getProductBySlug(currentSlug);
  if (!current) return products.slice(0, limit);
  return products
    .filter((p) => p.slug !== currentSlug)
    .sort((a) => (a.collectionSlug === current.collectionSlug ? -1 : 1))
    .slice(0, limit);
}
