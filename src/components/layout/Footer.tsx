"use client";

import React, { useState } from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { Container } from "./Container";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <footer className="w-full bg-surface border-t border-border mt-auto transition-colors duration-150">
      <Container size="wide" className="py-12 sm:py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-12">
          {/* Brand & Newsletter Column */}
          <div className="md:col-span-5 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Link href="/" className="inline-block">
                <span className="font-display font-light text-2xl sm:text-3xl tracking-[0.2em] text-foreground">
                  {siteConfig.name.toUpperCase()}
                </span>
              </Link>
              <span className="eyebrow text-accent">
                Press-On Nail Studio
              </span>
            </div>

            {/* Newsletter Subscription Box */}
            <div className="flex flex-col gap-2.5 max-w-sm">
              <span className="text-xs uppercase tracking-wider font-medium text-foreground">
                Private Studio Releases
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Receive release updates for new collections and custom order openings.
              </p>

              {subscribed ? (
                <div className="p-3 bg-surface-subtle border border-border text-xs text-accent font-medium">
                  Thank you for subscribing.
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2 mt-1">
                  <Input
                    type="email"
                    required
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 text-xs"
                    aria-label="Email address for studio newsletter"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    className="shrink-0 h-10 px-4 text-[11px]"
                  >
                    Subscribe
                  </Button>
                </form>
              )}
            </div>
          </div>

          {/* Footer Navigation Columns */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {siteConfig.footerNav.map((section) => (
              <div key={section.title} className="flex flex-col gap-3.5">
                <span className="eyebrow text-foreground/90 font-medium">
                  {section.title}
                </span>
                <ul className="flex flex-col gap-2 text-xs">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="text-muted-foreground hover:text-foreground transition-colors duration-150"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p>

          {/* Social Links */}
          <div className="flex items-center gap-6">
            {siteConfig.socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors duration-150 uppercase tracking-widest text-[10px]"
              >
                {social.label}
              </a>
            ))}
          </div>
        </div>
      </Container>
    </footer>
  );
}
