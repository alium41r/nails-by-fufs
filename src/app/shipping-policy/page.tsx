import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { businessDetails } from "@/config/business";

export const metadata: Metadata = {
  title: "Shipping & Service Policy — Nails by Fufs",
  description:
    "How Nails by Fufs handcrafts, sizes and delivers press-on sets: delivery to major cities across Pakistan within 3–5 days after processing, and 4 days processing for custom orders.",
};

const sections: LegalSection[] = [
  {
    id: "handmade-to-order",
    heading: "Sets are handcrafted in small batches",
    paragraphs: [
      "Every Nails by Fufs set is individually painted, shaped and top-coated by artist Fatima in small studio batches rather than pulled from mass-produced stock. Each set is prepared for the shape, length and sizing you select before it is sent.",
    ],
  },
  {
    id: "what-is-included",
    heading: "What comes with a set",
    paragraphs: [
      "Each set includes ten custom-shaped nail tips, a complete prep kit (wooden cuticle stick, gentle mini buffer and prep wipes) and adhesive application materials (adhesive tabs and nail glue).",
    ],
  },
  {
    id: "sizing-service",
    heading: "Sizing service",
    bullets: [
      "A complimentary bespoke sizing kit is included with your first order.",
      "You can choose standard XS, S, M or L presets, or provide your own millimetre measurements for all ten nails at no extra charge.",
      "The Size Guide explains how to measure, and the How It Works page walks through the studio process.",
    ],
  },
  {
    id: "delivery",
    heading: "Delivery",
    paragraphs: [
      "We deliver to major cities across Pakistan.",
      "Delivery normally takes 3–5 days after your order has been processed.",
      "Orders are sent to the delivery address you provide, and the studio contacts you using the email address and phone number supplied with your order if anything needs clarifying.",
    ],
  },
  {
    id: "processing",
    heading: "Processing time",
    paragraphs: [
      "Custom orders require 4 days of processing time. Delivery time is additional to that processing period.",
    ],
  },
  {
    id: "custom-commissions",
    heading: "Custom commissions",
    paragraphs: [
      "Custom requests are submitted through the custom order form with your concept, preferred shape and length, colour notes and any reference images. Fatima reviews the request and contacts you directly to confirm details before the set is crafted.",
      "If you are commissioning a set for a wedding or a specific event, submit your request in advance — a custom order needs its 4 day processing period before it is sent.",
    ],
  },
  {
    id: "service-contact",
    heading: "Service contact",
    paragraphs: [
      "Questions about an order in progress can be raised at any time using the details below.",
    ],
    bullets: [
      `Email: ${businessDetails.email}`,
      `Phone: ${businessDetails.phone}`,
      `Studio: ${businessDetails.addressLines.join(", ")}`,
    ],
  },
];

export default function ShippingPolicyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Shipping & Service Policy"
      description="How sets are made, sized and delivered — and how to reach the studio about an order."
      intro={[
        "This page covers the studio's service: how a set is made, how sizing is handled, how long processing takes and how orders are delivered.",
      ]}
      sections={sections}
    />
  );
}
