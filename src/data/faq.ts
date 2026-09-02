export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: "sets" | "sizing" | "custom" | "care";
}

export interface FaqCategory {
  id: "all" | "sets" | "sizing" | "custom" | "care";
  label: string;
}

export const faqHero = {
  eyebrow: "Support & Answers",
  title: "Frequently Asked Questions",
  description:
    "Everything you need to know about our handcrafted press-on sets, sizing, bespoke commissions, and gentle nail care.",
};

export const faqCategories: FaqCategory[] = [
  { id: "all", label: "All Questions" },
  { id: "sets", label: "Sets & Orders" },
  { id: "sizing", label: "Sizing & Fit" },
  { id: "custom", label: "Custom Requests" },
  { id: "care", label: "Application & Care" },
];

export const faqItems: FaqItem[] = [
  {
    id: "faq-1",
    category: "sets",
    question: "What is included with each press-on set?",
    answer:
      "Every Nails by Fufs set comes with 10 custom-shaped nail tips, a complete prep kit (wooden cuticle stick, gentle mini buffer, prep wipes), and adhesive application materials (adhesive tabs and nail glue).",
  },
  {
    id: "faq-2",
    category: "sets",
    question: "Are these sets handmade or mass-produced?",
    answer:
      "Each set is individually painted, shaped, and top-coated by independent nail artist Fatima in small studio batches. We do not use generic factory-printed plastic tips.",
  },
  {
    id: "faq-3",
    category: "sizing",
    question: "How do I find my nail size?",
    answer:
      "You can measure the widest part of your natural nail bed using clear tape and a millimeter ruler as shown on our Size Guide page. We also offer standard XS, S, M, and L presets, or you can enter custom millimeter numbers for all 10 fingers.",
  },
  {
    id: "faq-4",
    category: "sizing",
    question: "What if my measurements don't match standard XS–L presets?",
    answer:
      "That is completely normal! Many clients have different widths across both hands. You can select 'Custom' on any product page or custom order request and provide your exact millimeter measurements at no extra charge.",
  },
  {
    id: "faq-5",
    category: "custom",
    question: "How do custom design commissions work?",
    answer:
      "On our Custom Orders page, you can share your design concept, preferred shape, length, color palette, and upload reference photos or moodboards. Fatima will review your vision and connect directly to confirm details before crafting your set.",
  },
  {
    id: "faq-6",
    category: "custom",
    question: "Can I commission nails for a wedding or special event?",
    answer:
      "Yes. Bespoke sets for weddings, formal events, and special photoshoots are welcome. We recommend submitting your custom request in advance with any event dates or outfit swatches you'd like to match.",
  },
  {
    id: "faq-7",
    category: "care",
    question: "How do I apply press-on nails for the best hold?",
    answer:
      "Gently push back cuticles, lightly buff the natural nail surface to remove shine, and wipe clean with the prep pad before applying adhesive tabs or glue. Press firmly for 15–20 seconds per nail.",
  },
  {
    id: "faq-8",
    category: "care",
    question: "How do I remove the nails without damaging my natural nails?",
    answer:
      "Soak your fingertips in warm soapy water (with a few drops of cuticle oil or baby oil if desired) for 10–15 minutes. The adhesive will soften and the nails will gently lift off without pulling or damage.",
  },
];

export const faqCta = {
  eyebrow: "Have Another Question?",
  title: "Need something not answered here?",
  description:
    "Reach out directly through our contact page or custom order inquiry form. We're happy to help with sizing, design concepts, or care questions.",
  primaryCta: { label: "Contact Studio", href: "/contact" },
  secondaryCta: { label: "Custom Commission", href: "/custom" },
};
