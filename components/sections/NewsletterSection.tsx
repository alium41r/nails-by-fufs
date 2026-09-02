"use client";

import React, { useState } from "react";
import { Container } from "@/components/layout/Container";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { newsletterContent } from "@/data/homepage";

export function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
      setEmail("");
    }
  };

  return (
    <section
      className="py-16 sm:py-24 border-b border-border bg-background"
      aria-labelledby="newsletter-heading"
    >
      <Container size="narrow">
        <div className="flex flex-col items-center text-center gap-4 max-w-md mx-auto">
          <span className="eyebrow text-accent tracking-[0.2em]">
            {newsletterContent.eyebrow}
          </span>

          <h2
            id="newsletter-heading"
            className="font-display font-light text-2xl sm:text-3xl lg:text-4xl text-foreground tracking-tight text-balance"
          >
            {newsletterContent.title}
          </h2>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-sans">
            {newsletterContent.description}
          </p>

          <div className="w-full pt-3">
            {submitted ? (
              <div className="p-3.5 bg-accent-subtle border border-accent/30 text-xs text-accent font-medium">
                Thank you. You are on the private studio release list.
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="flex flex-col sm:flex-row gap-2.5 max-w-sm mx-auto"
              >
                <Input
                  type="email"
                  required
                  placeholder="Your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 text-xs"
                  aria-label="Email address for studio release updates"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="shrink-0 sm:px-6 text-xs uppercase tracking-wider"
                >
                  Join
                </Button>
              </form>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
