import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { businessDetails } from "@/config/business";

export const metadata: Metadata = {
  title: "Privacy Policy — Nails by Fufs",
  description:
    "What the Nails by Fufs website collects, why it is collected, and how it is kept — including custom order requests, reference images and delivery details.",
};

const sections: LegalSection[] = [
  {
    id: "who-we-are",
    heading: "Who we are",
    paragraphs: [
      "Nails by Fufs is an independent press-on nail studio. Every set is individually painted, shaped and top-coated by artist Fatima in small studio batches — we do not use generic factory-printed plastic tips.",
      "This policy explains what happens to the information you share through this website. The studio's contact details are listed at the bottom of this page and on our contact page.",
    ],
  },
  {
    id: "what-you-send-us",
    heading: "What you can send us through this site",
    paragraphs: [
      "Different parts of the site collect different things. This is what each one asks for and what it is for:",
    ],
    bullets: [
      "Custom order requests (the custom order form): your name, email address, an optional Instagram handle or preferred contact; your design preferences — shape, length, sizing option (sizing kit, preset size XS–L, or your own millimetre measurements), optional colour notes, your design description, and optional event date, budget guidance and additional notes; and any reference images you choose to attach.",
      "Bag and checkout: the contents of your bag are stored in your own browser so the bag survives a page reload. At checkout you can enter contact details (name, email, phone) and delivery details (country, street address, optional second address line, city, optional region, optional postal code, optional delivery notes) so an order can be prepared.",
      "Direct contact: if you email or phone the studio using the details published on this site, the studio receives whatever you choose to send in that message so it can reply to you.",
      "Theme preference: whether you prefer the light or dark appearance of the site is stored in your browser only.",
    ],
  },
  {
    id: "what-we-do-not-collect",
    heading: "What this site does not collect",
    bullets: [
      "No customer accounts and no passwords — you can use the storefront and send a custom request without registering.",
      "No payment card details. Online payment is not enabled yet, so no card or banking information is requested or stored by this site.",
      "No third-party advertising or analytics trackers. The site does not embed advertising pixels or visitor-analytics scripts.",
    ],
  },
  {
    id: "how-we-use-it",
    heading: "How your information is used",
    paragraphs: [
      "Information you send is used only for the purpose you sent it for: reviewing and producing a custom commission, replying to your message, preparing and delivering an order, and keeping the records needed to do those things.",
      "The site runs on Vercel (hosting) and Supabase (database and file storage). These providers process data on the studio's behalf so the site can operate.",
    ],
  },
  {
    id: "where-it-is-stored",
    heading: "Where your information is kept",
    paragraphs: [
      "Custom order requests and the reference images attached to them are stored in the studio's Supabase project. Reference images are held in a private storage bucket: they are not publicly listed or downloadable, and they are only reachable by the studio through short-lived authorised links.",
      "The contents of your bag and your theme preference never leave your device unless you submit a form.",
      "The checkout step is not connected to the studio's systems yet, so delivery details entered there are not sent to us and no order is completed through that page.",
    ],
  },
  {
    id: "retention",
    heading: "How long we keep it",
    paragraphs: [
      "Custom order requests, the reference images attached to them and related order records are retained only for as long as is reasonably necessary to handle your request, produce your order, maintain business records, or meet legal requirements.",
    ],
  },
  {
    id: "your-requests",
    heading: "Your choices and requests",
    paragraphs: [
      `You may contact the studio at any time to request access to the information we hold about you, to request that it be corrected, or to request that it be deleted, where applicable. Email ${businessDetails.email} or phone ${businessDetails.phone}, and include the email address you wrote from so your request can be matched to you.`,
    ],
  },
  {
    id: "changes",
    heading: "Changes to this policy",
    paragraphs: [
      "If this policy changes, the updated version will be published on this page with a new date at the top. Continuing to use the site after an update means the current version applies.",
    ],
  },
  {
    id: "questions",
    heading: "Questions about this policy",
    paragraphs: [
      `If anything here is unclear, contact the studio at ${businessDetails.email} or ${businessDetails.phone} and we will explain how your information is handled.`,
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      description="What this website collects, why it is collected, and how it is kept."
      intro={[
        "This policy covers this website only. It describes what the site actually does with your information, based on how the storefront and the custom order form are built today.",
      ]}
      sections={sections}
    />
  );
}
