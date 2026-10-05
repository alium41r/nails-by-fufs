import React from "react";
import Link from "next/link";

import { Container } from "./Container";
import { Button } from "@/components/ui/Button";
import { StudioContent } from "@/components/studio/StudioContent";
import type {
  NavSection,
  NewsletterContent,
  SiteContact,
  SiteIdentity,
  SocialLink,
} from "@/lib/site-content-schema";

/**
 * The storefront footer.
 *
 * Nav column titles, all thirteen link labels and destinations, the social links,
 * the newsletter block copy and the tagline are owner-managed. The copyright year
 * stays computed and the brand name comes from the identity document, so the two
 * cannot drift.
 *
 * The link columns are rendered from data, so a footer that gains or loses a column
 * still lays out — the grid is a fixed 4-track on desktop (as before), with the
 * brand block spanning 5 of 12 columns.
 */
export interface FooterProps {
  identity: SiteIdentity;
  contact: SiteContact;
  footerNav: NavSection[];
  socials: SocialLink[];
  newsletter: NewsletterContent;
}

export function Footer({ identity, contact, footerNav, socials, newsletter }: FooterProps) {
  const emailHref = `mailto:${contact.email}`;
  const subject = newsletter.emailSubject || "Studio release updates";
  const visibleSocials = socials.filter((social) => social.enabled);

  return (
    <footer className="w-full bg-surface border-t border-border mt-auto transition-colors duration-150">
      <Container size="wide" className="py-12 sm:py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-12">
          {/* Brand & Newsletter Column */}
          <div className="md:col-span-5 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Link href="/" className="inline-block">
                <span className="font-display font-light text-2xl sm:text-3xl tracking-[0.2em] text-foreground">
                  {identity.name.toUpperCase()}
                </span>
              </Link>
              <span className="eyebrow text-accent">{identity.footerTagline}</span>
            </div>

            {/* Newsletter Subscription Box */}
            <div className="flex flex-col gap-2.5 max-w-sm">
              <StudioContent
                target={{ key: "site.newsletter", field: "heading", label: "Footer heading" }}
                className="text-xs uppercase tracking-wider font-medium text-foreground"
              >
                {newsletter.heading}
              </StudioContent>
              <StudioContent
                as="div"
                target={{ key: "site.newsletter", field: "description", label: "Footer copy" }}
                className="text-xs text-muted-foreground leading-relaxed"
              >
                {newsletter.description}
              </StudioContent>

              {/* There is no newsletter backend yet. Rather than showing a
                  subscribe form that cannot send — and confirming a
                  subscription that never happened — this points at the studio's
                  real inbox, which is the channel that actually works. */}
              <StudioContent
                as="div"
                target={{ key: "site.newsletter", field: "ctaLabel", label: "Footer button" }}
              >
                <Button
                  href={`${emailHref}?subject=${encodeURIComponent(subject)}`}
                  variant="primary"
                  size="sm"
                  className="mt-1 h-10 px-4 text-[11px] w-full sm:w-auto"
                >
                  {newsletter.ctaLabel}
                </Button>
              </StudioContent>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Opens your email app, or write to {contact.email}.
              </p>
            </div>
          </div>

          {/* Footer Navigation Columns */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-8">
            {footerNav.map((section) => {
              const items = section.items.filter((item) => item.enabled);
              if (items.length === 0) return null;

              return (
                <div key={section.key} className="flex flex-col gap-3.5">
                  <span className="eyebrow text-foreground/90 font-medium">
                    {section.title}
                  </span>
                  <ul className="flex flex-col gap-2 text-xs">
                    {items.map((item) => (
                      <li key={item.key}>
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
              );
            })}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>
            © {new Date().getFullYear()} {identity.name}. All rights reserved.
          </p>

          {/* Social Links */}
          {visibleSocials.length > 0 && (
            <div className="flex items-center gap-6">
              {visibleSocials.map((social) => (
                <a
                  key={social.key}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors duration-150 uppercase tracking-widest text-[10px]"
                >
                  {social.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </Container>
    </footer>
  );
}
