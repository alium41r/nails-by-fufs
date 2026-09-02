import React from "react";
import { Shell } from "@/components/layout/Shell";
import { Container } from "@/components/layout/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export default function CheckoutPage() {
  return (
    <Shell>
      <div className="flex-1 flex items-center justify-center py-20 sm:py-28">
        <Container size="narrow" className="text-center">
          <SectionHeading
            eyebrow="/checkout"
            title="Checkout"
            subtitle="Placeholder route for navigation and theme verification."
            align="center"
          />
        </Container>
      </div>
    </Shell>
  );
}
