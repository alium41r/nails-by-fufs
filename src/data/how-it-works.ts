export interface ProcessStepItem {
  number: string;
  title: string;
  subtitle: string;
  description: string;
  detail: string;
  imagePlaceholder: {
    label: string;
    sublabel: string;
    alt: string;
    ratio: "portrait" | "square" | "classic";
  };
}

export interface CareNoteItem {
  title: string;
  description: string;
}

export const howItWorksHero = {
  eyebrow: "The Process",
  title: "Your set, made simple.",
  description:
    "An effortless approach to high-end nail artistry. From choosing your design to gentle removal, here is how our handcrafted sets work.",
  imagePlaceholder: {
    label: "Application & Finish Lookbook",
    sublabel: "16:9 • EDITORIAL PROCESS",
    alt: "Nails by Fufs editorial application and finishing guide",
  },
};

export const processStepsData: ProcessStepItem[] = [
  {
    number: "01",
    title: "Choose",
    subtitle: "Find your shape & aesthetic",
    description:
      "Explore ready-to-wear collections in various lengths and finishes, or request a bespoke concept designed around your event or mood.",
    detail: "Available in Almond, Short Square, Oval, Stiletto, and Coffin shapes.",
    imagePlaceholder: {
      label: "Design Selection",
      sublabel: "4:5 • STEP 01",
      alt: "Selecting nail design and shape",
      ratio: "portrait",
    },
  },
  {
    number: "02",
    title: "Size",
    subtitle: "Ensure a natural, seamless fit",
    description:
      "Select your standard preset size (XS–L), measure with our printable size guide, or request a complimentary sizing kit with your order.",
    detail: "A proper fit ensures comfortable wear and a seamless cuticle line.",
    imagePlaceholder: {
      label: "Sizing & Fit Check",
      sublabel: "4:5 • STEP 02",
      alt: "Checking nail size and cuticle fit",
      ratio: "portrait",
    },
  },
  {
    number: "03",
    title: "Apply",
    subtitle: "Quick tabs or extended glue",
    description:
      "Gently prep your natural nails with the included kit. Use adhesive tabs for flexible temporary wear or salon-grade glue for extended durability.",
    detail: "Prep wipe, buffer, and cuticle pusher are included with every set.",
    imagePlaceholder: {
      label: "Application Prep",
      sublabel: "4:5 • STEP 03",
      alt: "Applying press-on nails with adhesive",
      ratio: "portrait",
    },
  },
  {
    number: "04",
    title: "Wear & Reuse",
    subtitle: "Gentle removal & repeat wear",
    description:
      "Soak in warm soapy water for gentle removal without damaging your natural nails. Store your set in the studio box for your next occasion.",
    detail: "Handcrafted durability allows multiple wears when cared for gently.",
    imagePlaceholder: {
      label: "Finished Set & Storage",
      sublabel: "4:5 • STEP 04",
      alt: "Worn set and studio storage packaging",
      ratio: "portrait",
    },
  },
];

export const careNotesData: CareNoteItem[] = [
  {
    title: "Clean Preparation",
    description:
      "Buff gently and wipe away natural oils before application to help the adhesive bond securely.",
  },
  {
    title: "No-Force Removal",
    description:
      "Never pry or force nails off. Soaking in warm water with a drop of cuticle oil allows easy, damage-free removal.",
  },
  {
    title: "Studio Storage",
    description:
      "Keep your nails organized and protected in their original presentation box between wears.",
  },
];

export const howItWorksCta = {
  eyebrow: "Next Step",
  title: "Ready to find your set?",
  description:
    "Browse ready-to-wear seasonal edits or commission a bespoke custom set created just for you.",
  primaryCta: { label: "Explore Ready-to-Wear", href: "/shop" },
  secondaryCta: { label: "Request Custom Set", href: "/custom" },
};
