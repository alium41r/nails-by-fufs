import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { businessDetails } from "@/config/business";

export const metadata: Metadata = {
  title: "Returns & Refunds — Nails by Fufs",
  description:
    "The returns, refund and cancellation terms for handcrafted Nails by Fufs press-on sets, including what to do if an order arrives damaged.",
};

const sections: LegalSection[] = [
  {
    id: "handcrafted",
    heading: "Every set is handcrafted",
    paragraphs: [
      "Nails by Fufs sets are not mass-produced. Each set is individually painted, shaped and top-coated by artist Fatima in small studio batches, which is why the studio asks for your shape, length and sizing before a set is made.",
    ],
  },
  {
    id: "sizing-support",
    heading: "Sizing support comes first",
    paragraphs: [
      "Most fit problems come from sizing, so the studio offers several ways to get it right before a set is made:",
    ],
    bullets: [
      "A complimentary bespoke sizing kit is included with your first order.",
      "You can choose standard XS, S, M or L presets, or enter your own millimetre measurements for all ten nails at no extra charge.",
      "The Size Guide and How It Works pages explain how to measure and how a set is made.",
    ],
  },
  {
    id: "change-of-mind",
    heading: "Change of mind",
    paragraphs: [
      "Returns and refunds are not offered for change of mind, or if you simply dislike a set once it arrives. Because each set is made individually to the details confirmed with you, please take a moment over the shape, length and sizing options before an order is placed.",
    ],
  },
  {
    id: "damaged",
    heading: "If your order arrives damaged",
    paragraphs: [
      "If a set arrives damaged, contact the studio with your order details and photographs of what arrived. You may request either a refund or a replacement for that order.",
      `Reach the studio at ${businessDetails.email} or ${businessDetails.phone}, or through the contact page.`,
    ],
  },
  {
    id: "cancellations",
    heading: "Cancellations",
    paragraphs: [
      "Once an order is confirmed it cannot be cancelled. If something about your order needs to change, contact the studio as early as possible — but a confirmed order cannot be called off.",
    ],
  },
  {
    id: "raise-a-request",
    heading: "How to raise a return or refund question",
    paragraphs: [
      "Contact the studio with your name, the email address you ordered with, and a short description of the issue so it can be matched to your order quickly.",
    ],
    bullets: [
      `Email: ${businessDetails.email}`,
      `Phone: ${businessDetails.phone}`,
      `Studio: ${businessDetails.addressLines.join(", ")}`,
    ],
  },
];

export default function ReturnsRefundsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Returns & Refunds"
      description="How returns, refunds and cancellations work for handcrafted sets."
      intro={[
        "This page sets out the studio's returns, refunds and cancellation terms. Because every set is handmade to the details confirmed with you, these terms are specific rather than general.",
      ]}
      sections={sections}
    />
  );
}
