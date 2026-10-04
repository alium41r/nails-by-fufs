import type { Metadata } from "next";
import { Shell } from "@/components/layout/Shell";
import { CheckoutContent } from "./checkout-content";

export const metadata: Metadata = {
  title: "Checkout — Nails by Fufs",
  description: "Enter your contact and delivery details to complete your Nails by Fufs order.",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <Shell>
      <CheckoutContent />
    </Shell>
  );
}
