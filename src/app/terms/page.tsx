import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { businessDetails } from "@/config/business";

export const metadata: Metadata = {
  title: "Terms & Conditions — Nails by Fufs",
  description:
    "The terms that apply to using the Nails by Fufs website and commissioning a handcrafted press-on set.",
};

const sections: LegalSection[] = [
  {
    id: "about-these-terms",
    heading: "About these terms",
    paragraphs: [
      "These terms apply to this website and to requests and orders placed through it. They are written to describe how the storefront and the studio actually work today.",
      "If you do not agree with them, please do not use the site or submit a request.",
    ],
  },
  {
    id: "using-the-site",
    heading: "Using the site",
    paragraphs: [
      "The site shows the studio's catalogue, sizing guidance and custom commission information. You are welcome to browse, and to submit a custom request, for personal use.",
      "You agree not to misuse the site — for example by submitting false information, attempting to interfere with it, or copying its content for commercial use.",
    ],
  },
  {
    id: "orders-and-availability",
    heading: "Orders and availability",
    paragraphs: [
      "Sets shown on the site come from the studio's live catalogue. Designs are made in small batches, so what is shown can change as pieces are made and released.",
      "Online payment is not enabled on this site yet. The checkout page can collect your contact and delivery details, but it does not currently complete an order or send those details to the studio, and no payment is taken through the site.",
      "Until checkout is enabled, the way to order is the custom order form, where Fatima confirms the shape, length, sizing and design details with you directly. Once an order is confirmed it cannot be cancelled — see the Returns & Refunds page for the returns and refund terms.",
    ],
  },
  {
    id: "prices-and-payment",
    heading: "Prices and payment",
    paragraphs: [
      "Catalogue prices are not published on the site yet and online payment is not enabled, so nothing is charged through the storefront. Until payment is live, pricing and payment are agreed directly with the studio when your order is confirmed.",
    ],
  },
  {
    id: "custom-commissions",
    heading: "Custom commissions",
    paragraphs: [
      "A custom request is a starting point, not a confirmed order. The studio reviews your concept, shape, length, colour notes and reference images, then contacts you directly to confirm the design and sizing before anything is crafted.",
      "Custom orders require 4 days of processing time, and delivery time is additional to that. Once details are confirmed with you, a commission is made to that agreed description.",
    ],
  },
  {
    id: "your-information",
    heading: "Information you give us",
    paragraphs: [
      "Please make sure the details you give us are accurate. The measurements you provide are used to make your set, and the delivery address you provide is where it will be sent, so mistakes there affect the finished result.",
      "How your information is handled is described in the Privacy Policy.",
    ],
  },
  {
    id: "designs-and-content",
    heading: "Designs and site content",
    paragraphs: [
      "The nail designs, artwork, written content and branding on this site are the studio's work. Reference images you send stay yours, and are used only to understand and produce your commission.",
    ],
  },
  {
    id: "third-party-links",
    heading: "Links to other platforms",
    paragraphs: [
      "The site links to social platforms such as Instagram, TikTok and Pinterest. Those platforms are separate services with their own terms and privacy practices.",
    ],
  },
  {
    id: "changes",
    heading: "Changes to these terms",
    paragraphs: [
      "These terms may be updated as the studio's service and the storefront change. The current version is always published on this page with its date at the top.",
    ],
  },
  {
    id: "governing-law",
    heading: "Governing law",
    paragraphs: [
      `Nails by Fufs operates from ${businessDetails.addressLines.join(", ")}, ${businessDetails.country}, and these terms are governed by the laws of ${businessDetails.jurisdiction}.`,
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms & Conditions"
      description="The terms that apply to using this site and commissioning a set from the studio."
      intro={[
        "These terms describe how the Nails by Fufs website and studio service work.",
      ]}
      sections={sections}
    />
  );
}
