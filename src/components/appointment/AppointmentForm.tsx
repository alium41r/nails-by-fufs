"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import {
  APPOINTMENT_SERVICES,
  INITIAL_APPOINTMENT_STATE,
  submitAppointmentRequest,
  type AppointmentFormState,
} from "@/data/appointment";
import { businessDetails } from "@/config/business";
import { CalendarCheck, MapPin, AlertCircle, RotateCcw, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const todayIso = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const formatDate = (iso: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export function AppointmentForm() {
  const [formData, setFormData] = useState<AppointmentFormState>(INITIAL_APPOINTMENT_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const locality = businessDetails.addressLines.join(", ");

  const handleChange = (field: keyof AppointmentFormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!formData.name.trim()) next.name = "Please enter your name";
    const digits = formData.phone.replace(/\D/g, "");
    if (!formData.phone.trim()) next.phone = "Please enter a phone or WhatsApp number";
    else if (digits.length < 10) next.phone = "Please enter a valid phone number";
    if (formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email)) {
      next.email = "Please enter a valid email address";
    }
    if (!formData.preferredDate) next.preferredDate = "Please choose a preferred date";
    else if (formData.preferredDate < todayIso()) next.preferredDate = "Please choose a date in the future";
    if (!formData.preferredTime) next.preferredTime = "Please choose a preferred time";
    if (formData.alternateDate && formData.alternateDate < todayIso()) {
      next.alternateDate = "Please choose a date in the future";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setSubmitError(null);
    if (!validate()) {
      setSubmitError("Please check the highlighted fields and try again.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitAppointmentRequest(formData);
      if (!result.ok) {
        const { form, ...fieldErrors } = result.errors;
        setErrors((prev) => ({ ...prev, ...(fieldErrors as Record<string, string>) }));
        setSubmitError(
          form ?? Object.values(fieldErrors)[0] ?? "Please check the highlighted fields and try again.",
        );
        return;
      }
      setIsSubmitted(true);
      window.scrollTo({ top: 120, behavior: "smooth" });
    } catch {
      setSubmitError("Something went wrong sending your request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData(INITIAL_APPOINTMENT_STATE);
    setErrors({});
    setSubmitError(null);
    setIsSubmitted(false);
  };

  if (isSubmitted) {
    const service = APPOINTMENT_SERVICES.find((s) => s.id === formData.serviceType);
    return (
      <div
        role="status"
        className="border border-border bg-surface p-8 sm:p-12 lg:p-16 flex flex-col items-center text-center gap-6 max-w-2xl mx-auto shadow-xs"
      >
        <div className="w-14 h-14 rounded-full bg-accent-subtle border border-accent/40 flex items-center justify-center text-accent">
          <CalendarCheck className="h-6 w-6" />
        </div>

        <div className="flex flex-col gap-2">
          <span className="eyebrow text-accent tracking-[0.2em]">Request Received</span>
          <h2 className="font-display font-light text-3xl sm:text-4xl text-foreground tracking-tight">
            Thank you, {formData.name.trim()}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed font-sans max-w-md">
            Your appointment is not confirmed yet. The studio will review your request and get in touch to confirm. Exact arrival details are shared once it is confirmed.
          </p>
        </div>

        <dl className="w-full bg-surface-subtle border border-border p-5 text-left grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
          <div>
            <dt className="text-[10px] uppercase font-mono text-foreground">Preferred date</dt>
            <dd className="text-muted-foreground mt-1">{formatDate(formData.preferredDate)}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase font-mono text-foreground">Preferred time</dt>
            <dd className="text-muted-foreground mt-1">{formData.preferredTime}</dd>
          </div>
          {formData.alternateDate && (
            <div>
              <dt className="text-[10px] uppercase font-mono text-foreground">Alternate date</dt>
              <dd className="text-muted-foreground mt-1">{formatDate(formData.alternateDate)}</dd>
            </div>
          )}
          <div>
            <dt className="text-[10px] uppercase font-mono text-foreground">Appointment</dt>
            <dd className="text-muted-foreground mt-1">{service?.name}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase font-mono text-foreground">Studio area</dt>
            <dd className="text-muted-foreground mt-1">{locality}</dd>
          </div>
        </dl>

        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleReset}
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            className="w-full sm:w-auto"
          >
            Request Another
          </Button>
          <Button
            href="/shop"
            variant="primary"
            size="md"
            rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
            className="w-full sm:w-auto"
          >
            Browse Sets
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-busy={isSubmitting}
      className="flex flex-col gap-12 sm:gap-16 w-full max-w-3xl mx-auto"
    >
      {/* 01 — Appointment details */}
      <section className="flex flex-col gap-6 border-b border-border pb-10" aria-labelledby="appt-details-heading">
        <div className="flex flex-col gap-1">
          <span className="eyebrow text-accent tracking-[0.2em]">01 / Appointment</span>
          <h2 id="appt-details-heading" className="font-display font-light text-2xl sm:text-3xl text-foreground">
            Your Preferred Time
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground font-sans">
            Suggest what suits you. The studio will confirm or propose another time.
          </p>
        </div>

        <fieldset className="flex flex-col gap-3 min-w-0">
          <legend className="text-xs uppercase tracking-[0.16em] font-medium text-foreground mb-2">
            What would you like applied?
          </legend>
          {APPOINTMENT_SERVICES.map((opt) => {
            const isSelected = formData.serviceType === opt.id;
            return (
              <label
                key={opt.id}
                className={cn(
                  "p-4 border transition-all duration-150 flex items-start gap-3 cursor-pointer focus-within:ring-1 focus-within:ring-accent",
                  isSelected
                    ? "border-accent bg-accent-subtle/50 ring-1 ring-accent"
                    : "border-border bg-surface hover:border-foreground/40",
                )}
              >
                <input
                  type="radio"
                  name="serviceType"
                  value={opt.id}
                  checked={isSelected}
                  onChange={() => handleChange("serviceType", opt.id)}
                  className="mt-0.5 h-4 w-4 accent-[var(--accent,currentColor)]"
                />
                <span className="flex flex-col gap-0.5 text-left">
                  <span className="text-xs font-medium text-foreground">{opt.name}</span>
                  <span className="text-[11px] text-muted-foreground">{opt.description}</span>
                </span>
              </label>
            );
          })}
        </fieldset>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <Input
            id="appt-date"
            type="date"
            label="Preferred Date *"
            min={todayIso()}
            required
            value={formData.preferredDate}
            error={errors.preferredDate}
            onChange={(e) => handleChange("preferredDate", e.target.value)}
          />
          <Input
            id="appt-time"
            type="time"
            label="Preferred Time *"
            required
            value={formData.preferredTime}
            error={errors.preferredTime}
            onChange={(e) => handleChange("preferredTime", e.target.value)}
          />
        </div>

        <Input
          id="appt-alt-date"
          type="date"
          label="Alternate Date (Optional)"
          min={todayIso()}
          helperText="A backup day in case your first choice isn't available."
          value={formData.alternateDate}
          error={errors.alternateDate}
          onChange={(e) => handleChange("alternateDate", e.target.value)}
        />
      </section>

      {/* 02 — Contact */}
      <section className="flex flex-col gap-5 border-b border-border pb-10" aria-labelledby="appt-contact-heading">
        <div className="flex flex-col gap-1">
          <span className="eyebrow text-accent tracking-[0.2em]">02 / Contact</span>
          <h2 id="appt-contact-heading" className="font-display font-light text-2xl sm:text-3xl text-foreground">
            About You
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground font-sans">
            How the studio can reach you to confirm your appointment.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <Input
            id="appt-name"
            label="Your Name *"
            autoComplete="name"
            required
            value={formData.name}
            error={errors.name}
            onChange={(e) => handleChange("name", e.target.value)}
          />
          <Input
            id="appt-phone"
            type="tel"
            label="Phone / WhatsApp *"
            autoComplete="tel"
            placeholder="03XX XXXXXXX"
            required
            value={formData.phone}
            error={errors.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
          />
        </div>

        <Input
          id="appt-email"
          type="email"
          label="Email Address (Optional)"
          autoComplete="email"
          placeholder="name@example.com"
          value={formData.email}
          error={errors.email}
          onChange={(e) => handleChange("email", e.target.value)}
        />
      </section>

      {/* 03 — Notes */}
      <section className="flex flex-col gap-5 border-b border-border pb-10" aria-labelledby="appt-notes-heading">
        <div className="flex flex-col gap-1">
          <span className="eyebrow text-accent tracking-[0.2em]">03 / Details</span>
          <h2 id="appt-notes-heading" className="font-display font-light text-2xl sm:text-3xl text-foreground">
            Anything Else?
          </h2>
        </div>

        <Input
          id="appt-set-details"
          label="Set or Design (Optional)"
          placeholder="e.g. a set name from the shop, or a short description"
          value={formData.setDetails}
          onChange={(e) => handleChange("setDetails", e.target.value)}
        />

        <Textarea
          id="appt-notes"
          label="Notes (Optional)"
          rows={3}
          placeholder="Occasion, nail concerns, accessibility needs, anything we should know..."
          value={formData.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
        />
      </section>

      {/* Submit */}
      <div className="flex flex-col items-center gap-4 text-center">
        {submitError && (
          <div
            role="alert"
            className="w-full flex items-start gap-2 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 p-3 text-left"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isSubmitting}
          className="w-full sm:w-auto sm:px-12 min-h-[50px] text-xs uppercase tracking-[0.18em]"
        >
          {isSubmitting ? "Sending Request..." : "Request Appointment"}
        </Button>

        <p className="text-[11px] text-muted-foreground font-sans max-w-md leading-relaxed inline-flex items-start gap-1.5 justify-center">
          <MapPin className="h-3.5 w-3.5 shrink-0 mt-px" aria-hidden="true" />
          <span>
            This is a request, not a confirmed booking. Nothing is charged here, and the exact address is only shared once the studio accepts.
          </span>
        </p>
      </div>
    </form>
  );
}
