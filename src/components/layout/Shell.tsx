import React from "react";

import { AnnouncementBar } from "./AnnouncementBar";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { getStorefrontCatalogue } from "@/lib/catalogue-server";
import { getSiteContent } from "@/lib/site-content";

interface ShellProps {
  children: React.ReactNode;
}

/**
 * The storefront chrome: announcement bar, header and footer.
 *
 * ## Why the chrome's data is read here rather than inside each component
 *
 * Everything below is owner-managed now — the announcement text, both navigation
 * lists, the social links, the brand name and the footer copy. Two of the three
 * consumers are Client Components (`Header`, `Footer`), so they cannot read the
 * database themselves, and the previous arrangement imported a module-level
 * config object directly into the client bundle — which is exactly what a
 * database-backed value cannot be.
 *
 * Reading once here and passing typed props down keeps every chrome component a
 * pure presentation component, and means one read for the whole chrome rather
 * than one per component, because `getSiteContent` is request-deduped.
 *
 * `StorefrontRouteLoading` is the deliberate exception: it is a loading skeleton,
 * it cannot await a read, and it renders before this boundary resolves. It uses
 * the code defaults instead, which is part of why those defaults are kept in
 * code rather than only in SQL.
 */
export async function Shell({ children }: ShellProps) {
  // The header search previews live catalogue sets on every route, so the
  // catalogue is loaded here and handed to the header. Callers that render the
  // catalogue themselves call getStorefrontCatalogue() too; it is request-cached
  // (react `cache`), so a page and the shell share a single read.
  const [{ products }, content] = await Promise.all([
    getStorefrontCatalogue(),
    getSiteContent(),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors duration-150">
      <AnnouncementBar announcement={content.announcement} />
      <Header
        products={products}
        identity={content.identity}
        nav={content.nav.main}
        mobileNav={content.nav.mobile}
      />
      <main className="flex-1 flex flex-col">{children}</main>
      <Footer
        identity={content.identity}
        contact={content.contact}
        footerNav={content.nav.footer}
        socials={content.socials}
        newsletter={content.newsletter}
      />
    </div>
  );
}
