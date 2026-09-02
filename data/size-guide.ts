export interface MeasurementStep {
  number: string;
  title: string;
  subtitle: string;
  instruction: string;
  detail: string;
  imagePlaceholder: {
    label: string;
    sublabel: string;
    alt: string;
  };
}

export interface StandardSizeRow {
  size: string;
  label: string;
  measurements: number[]; // [Thumb, Index, Middle, Ring, Pinky]
  description: string;
}

export interface ShapeGuideItem {
  name: string;
  description: string;
  bestFor: string;
}

export const sizeGuideHero = {
  eyebrow: "Fitting Guide",
  title: "Find your fit.",
  description:
    "A proper fit ensures your press-on nails feel comfortable, natural, and secure. Follow this simple guide to find your standard size or measure for custom widths.",
  imagePlaceholder: {
    label: "Nail Sizing & Fit Lookbook",
    sublabel: "16:9 • SIZING VISUAL",
    alt: "Nails by Fufs nail sizing and fit demonstration",
  },
};

export const measurementSteps: MeasurementStep[] = [
  {
    number: "01",
    title: "Tape & Align",
    subtitle: "Across the widest curve",
    instruction:
      "Press a piece of clear adhesive tape horizontally across the widest part of your natural nail bed, pressing firmly into the sidewalls.",
    detail: "Ensure the tape lies smooth and flat against the natural curve of your nail.",
    imagePlaceholder: {
      label: "Tape Placement Step",
      sublabel: "4:5 • STEP 01",
      alt: "Placing tape across natural nail bed",
    },
  },
  {
    number: "02",
    title: "Mark the Sidewalls",
    subtitle: "Pinpoint the widest edges",
    instruction:
      "Using a fine-tip pen or marker, draw a distinct mark on the tape at the exact left and right edges where your nail meets the skin.",
    detail: "Keep your finger relaxed to mark the accurate natural boundary.",
    imagePlaceholder: {
      label: "Marking Sidewalls Step",
      sublabel: "4:5 • STEP 02",
      alt: "Marking the edges of the nail bed with a pen",
    },
  },
  {
    number: "03",
    title: "Measure with Ruler",
    subtitle: "Read in millimeters (mm)",
    instruction:
      "Remove the tape, place it flat against a standard millimeter ruler, and measure the distance between the two marked lines.",
    detail: "Always record your measurement in millimeters (mm) for precision.",
    imagePlaceholder: {
      label: "Measuring on Ruler Step",
      sublabel: "4:5 • STEP 03",
      alt: "Measuring the marked tape against a millimeter ruler",
    },
  },
  {
    number: "04",
    title: "Match Your Size",
    subtitle: "Compare against our chart",
    instruction:
      "Record the measurements for all 10 fingers (thumb to pinky on both hands) and match them with our standard preset sizes or choose Custom.",
    detail: "It is normal for your dominant hand to measure slightly larger.",
    imagePlaceholder: {
      label: "Chart Matching Step",
      sublabel: "4:5 • STEP 04",
      alt: "Matching recorded millimeter measurements to size chart",
    },
  },
];

export const fingerLabels = ["Thumb", "Index", "Middle", "Ring", "Pinky"];

export const standardSizesData: StandardSizeRow[] = [
  {
    size: "XS",
    label: "Extra Small",
    measurements: [14, 10, 11, 10, 8],
    description: "Ideal for petite, narrow nail beds.",
  },
  {
    size: "S",
    label: "Small",
    measurements: [15, 11, 12, 11, 9],
    description: "Common for smaller to average nail beds.",
  },
  {
    size: "M",
    label: "Medium",
    measurements: [16, 12, 13, 12, 10],
    description: "Our most versatile and popular standard fit.",
  },
  {
    size: "L",
    label: "Large",
    measurements: [17, 13, 14, 13, 11],
    description: "Suited for wider, flatter nail beds.",
  },
];

export const shapeGuideData: ShapeGuideItem[] = [
  {
    name: "Almond",
    description: "Softly tapered sides with a rounded feminine tip.",
    bestFor: "Versatile everyday elegance & elongating fingers",
  },
  {
    name: "Short Square",
    description: "Clean straight edge with crisp 90-degree corners.",
    bestFor: "Active daily wear, typing, and minimalist looks",
  },
  {
    name: "Oval",
    description: "Gently curved arch following the natural cuticle line.",
    bestFor: "Classic, timeless natural look",
  },
  {
    name: "Stiletto",
    description: "Dramatic sculpted taper ending in a sharp tip.",
    bestFor: "Bold statement styles & special occasions",
  },
  {
    name: "Coffin",
    description: "Tapered sides terminating in a modern flat tip.",
    bestFor: "Fashion-forward looks & medium-to-long lengths",
  },
];

export const sizeGuideAdvice = [
  {
    title: "Size Up if In-Between",
    description:
      "If your millimeter measurement falls between two sizes, we recommend choosing the slightly larger size. A press-on that is slightly wide can be gently filed on the sides, but a nail that is too small cannot be enlarged.",
  },
  {
    title: "Both Hands Matter",
    description:
      "Nails on your dominant hand are often 0.5–1mm wider than your non-dominant hand. If your sizes differ, you can enter custom measurements for both hands on the custom order page.",
  },
  {
    title: "Custom Sizing is Complimentary",
    description:
      "If standard XS–L presets do not match your fingers, select 'Custom' on any product page and enter your exact millimeter numbers at no extra charge.",
  },
];

export const sizeGuideCta = {
  eyebrow: "Next Step",
  title: "Ready to choose your set?",
  description:
    "Browse our ready-to-wear collections or commission a bespoke custom set tailored to your exact measurements.",
  primaryCta: { label: "Shop All Sets", href: "/shop" },
  secondaryCta: { label: "Request Custom Set", href: "/custom" },
};
