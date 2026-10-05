import React from "react";
import type { Metadata } from "next";
import { Shell } from "@/components/layout/Shell";
import { Container } from "@/components/layout/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { AppointmentForm } from "@/components/appointment/AppointmentForm";
import { getSiteContent } from "@/lib/site-content";
import { Hand, MapPin, CalendarCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Book an Appointment — In-Person Nail Application | Nails by Fufs",
  description:
    "Request an in-person press-on nail application with Fufs at the studio in Sector M, DHA Phase 5, Lahore. Appointments are confirmed by the studio.",
};

const steps = [
  {
    icon: CalendarCheck,
    title: "01 • Request a Time",
    body: "Share your preferred date, time and contact details.",
  },
  {
    icon: Hand,
    title: "02 • Studio Confirms",
    body: "Fufs reviews your request and confirms with you directly.",
  },
  {
    icon: MapPin,
    title: "03 • Arrival Details",
    body: "The exact address is shared only once confirmed.",
  },
];

/**
 * The locality shown here is owner-managed (`site.contact`), read on the server
 * and handed to the form as a prop.
 */
export default async function BookAppointmentPage() {
  const { contact } = await getSiteContent();
  const locality = contact.addressLines.join(", ");

  return (
    <Shell>
      <div className="py-10 sm:py-14 lg:py-20 bg-background">
        <Container size="wide">
          <div className="flex flex-col gap-10 sm:gap-14 lg:gap-18">
            <Breadcrumbs
              items={[
                { label: "Home", href: "/" },
                { label: "Book Appointment" },
              ]}
            />

            <div className="flex flex-col items-center text-center gap-4 max-w-2xl mx-auto">
              <span className="eyebrow text-accent tracking-[0.2em]">In-Person Appointments</span>

              <h1 className="font-display font-light text-4xl sm:text-5xl lg:text-6xl text-foreground tracking-tight text-balance">
                Have your set applied by hand.
              </h1>

              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-sans max-w-lg">
                Visit the studio and have your press-on nails applied directly by Fufs. Request a time below and we&apos;ll confirm it with you personally.
              </p>

              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-foreground mt-1">
                <MapPin className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                {locality}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-y border-border bg-surface-subtle/30 px-6 sm:px-8">
              {steps.map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-full bg-accent-subtle border border-accent/30 flex items-center justify-center text-accent shrink-0 mt-0.5">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col gap-0.5 text-left">
                    <span className="text-xs uppercase tracking-wider font-medium text-foreground">{title}</span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="w-full">
              <AppointmentForm locality={locality} />
            </div>
          </div>
        </Container>
      </div>
    </Shell>
  );
}
