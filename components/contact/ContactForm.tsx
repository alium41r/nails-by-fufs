"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import {
  ContactFormState,
  INITIAL_CONTACT_STATE,
  contactInquiryReasons,
} from "@/data/contact";
import { Heart, RotateCcw, ArrowRight } from "lucide-react";

export function ContactForm() {
  const [formData, setFormData] = useState<ContactFormState>(INITIAL_CONTACT_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (field: keyof ContactFormState, value: string) => {
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
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = "Please enter your name";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Please enter your email address";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!formData.message.trim()) {
      newErrors.message = "Please enter your message";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 600);
  };

  const handleReset = () => {
    setFormData(INITIAL_CONTACT_STATE);
    setErrors({});
    setIsSubmitted(false);
  };

  if (isSubmitted) {
    return (
      <div className="border border-border bg-surface p-8 sm:p-12 flex flex-col items-center text-center gap-6 max-w-xl mx-auto shadow-xs">
        <div className="w-12 h-12 rounded-full bg-accent-subtle border border-accent/40 flex items-center justify-center text-accent">
          <Heart className="h-5 w-5" />
        </div>

        <div className="flex flex-col gap-2">
          <span className="eyebrow text-accent tracking-[0.2em]">Message Sent</span>
          <h2 className="font-display font-light text-2xl sm:text-3xl text-foreground">
            Thank you, {formData.name}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-sans max-w-md">
            Your message regarding &ldquo;{formData.subject}&rdquo; has been received. Fatima will review your note and respond to your email.
          </p>
        </div>

        <div className="p-3 bg-surface-subtle border border-border text-[11px] text-muted-foreground font-mono w-full">
          Frontend Preview: Message dispatched successfully.
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleReset}
            className="w-full sm:w-auto inline-flex items-center gap-2"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Send Another Note</span>
          </Button>

          <Button
            href="/shop"
            variant="primary"
            size="md"
            className="w-full sm:w-auto inline-flex items-center gap-2"
          >
            <span>Explore Nails</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 w-full max-w-xl mx-auto text-left"
      noValidate
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <Input
          id="contact-name"
          label="Your Name *"
          placeholder="e.g. Fatima / Sarah"
          required
          value={formData.name}
          error={errors.name}
          onChange={(e) => handleInputChange("name", e.target.value)}
        />

        <Input
          id="contact-email"
          type="email"
          label="Email Address *"
          placeholder="name@example.com"
          required
          value={formData.email}
          error={errors.email}
          onChange={(e) => handleInputChange("email", e.target.value)}
        />
      </div>

      {/* Subject Dropdown */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="contact-subject"
          className="text-xs font-medium tracking-wider uppercase text-foreground/80"
        >
          Reason for Inquiry
        </label>
        <select
          id="contact-subject"
          value={formData.subject}
          onChange={(e) => handleInputChange("subject", e.target.value)}
          className="w-full h-11 px-3.5 bg-surface text-foreground text-sm border border-border transition-colors duration-150 focus-visible:outline-none focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent cursor-pointer rounded-xs"
        >
          {contactInquiryReasons.map((reason) => (
            <option key={reason} value={reason}>
              {reason}
            </option>
          ))}
        </select>
      </div>

      {/* Message Area */}
      <Textarea
        id="contact-message"
        label="Message *"
        rows={5}
        required
        placeholder="How can we help? Tell us about your question or inquiry..."
        value={formData.message}
        error={errors.message}
        onChange={(e) => handleInputChange("message", e.target.value)}
      />

      <div className="pt-2">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={isSubmitting}
          className="w-full sm:w-auto sm:px-10 min-h-[48px] text-xs uppercase tracking-[0.16em]"
        >
          {isSubmitting ? "Sending..." : "Send Message"}
        </Button>
      </div>
    </form>
  );
}
