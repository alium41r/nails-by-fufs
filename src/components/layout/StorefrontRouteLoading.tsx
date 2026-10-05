import React from "react";

import { siteConfig } from "@/config/site";
import { DEFAULT_IDENTITY } from "@/lib/site-content-schema";
import { Container } from "./Container";

/**
 * Shared fallback for the storefront's dynamic routes.
 *
 * ## Why a loading boundary is needed at all
 *
 * Every storefront page renders its own chrome (`<Shell>`) and awaits
 * `getStorefrontCatalogue()` before it can emit anything. Without a route-level
 * loading boundary the App Router has nothing to paint, so a client-side
 * navigation leaves the *previous* page frozen on screen until the new route's
 * server render finishes. The navigation latency audit measured that window at
 * 630–1130 ms. With this boundary the fallback is painted about 24 ms after the
 * click.
 *
 * ## Why it reproduces the header and footer
 *
 * The chrome lives inside each page's `<Shell>`, not in a shared layout, so the
 * App Router unmounts it during the transition. The first version of this
 * fallback rendered only a rule and reserved space, which was measured to drop
 * the header for the whole loading window — a visible jump, and exactly the
 * layout shift the work was meant to avoid.
 *
 * Moving `<Shell>` into the root layout would remove the duplication, but five
 * storefront pages (`/design-system` and the four legal pages) deliberately
 * render chrome through their own components instead of `<Shell>`, so a
 * layout-level shell would double-wrap them. Reproducing the chrome here is the
 * contained option.
 *
 * The header and footer below are therefore **static replicas**: same elements,
 * same type scale, same heights, but no interactivity. They exist to hold the
 * page still for a few hundred milliseconds, so they are intentionally plain
 * markup rather than the real `Header`/`Footer` components — mounting those
 * would ship their client JavaScript and require the catalogue they were being
 * used to avoid waiting for.
 *
 * To stop the replicas drifting from the real chrome they take their navigation
 * labels and the announcement text from the same `siteConfig` the live
 * components read, and they reuse the real `Container`. The two visual
 * differences from the live header are deliberate and documented inline: the
 * active-link highlight and the cart count, both of which need request data.
 *
 * ## Freshness note
 *
 * This boundary is a safety net, not the normal path: the catalogue cache added
 * alongside it means a navigation usually resolves in tens of milliseconds.
 */
export function StorefrontRouteLoading() {
  const { announcement, mainNav } = siteConfig;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Announcement bar — mirrors <AnnouncementBar>, but never wraps its text in a link. */}
      {announcement.enabled && announcement.text && (
        <aside
          aria-label="Announcement"
          className="w-full bg-surface-subtle border-b border-border text-foreground/85"
        >
          <Container size="wide">
            <div className="flex h-8 sm:h-9 items-center justify-center text-center px-2">
              <span className="text-[10px] sm:text-[11px] font-medium tracking-[0.14em] uppercase text-foreground/80">
                {announcement.text}
              </span>
            </div>
          </Container>
        </aside>
      )}

      {/*
        Header — mirrors <Header> exactly, including its 81px height.
        The accent rule is an absolutely-positioned overlay rather than a
        `border-t`, so it does not add to the box height and the header does not
        shift by 2px when the real one mounts.
      */}
      <header className="sticky top-0 z-40 w-full bg-surface border-b border-border">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-accent" role="presentation" />
        <Container size="wide">
          <div className="flex h-16 sm:h-20 items-center justify-between">
            {/* Mobile menu trigger placeholder, matching the live 44px control. */}
            <div className="flex items-center lg:hidden" aria-hidden="true">
              <span className="inline-flex h-11 w-11 items-center justify-center -ml-2" />
            </div>

            <nav className="hidden lg:flex items-center gap-5 xl:gap-7" aria-hidden="true">
              {mainNav.map((item) => (
                <span
                  key={item.href}
                  className="text-xs uppercase tracking-[0.16em] text-foreground/80"
                >
                  {item.label}
                </span>
              ))}
            </nav>

            <div className="text-center">
              <span className="font-display font-light text-xl sm:text-2xl lg:text-3xl tracking-[0.2em] text-foreground">
                {siteConfig.name.toUpperCase()}
              </span>
              <span className="hidden sm:block text-[9px] uppercase tracking-[0.28em] text-muted-foreground -mt-0.5">
                {siteConfig.shortName.toUpperCase()} • {DEFAULT_IDENTITY.skeletonTagline}
              </span>
            </div>

            {/*
              Utility actions. The search and theme controls are omitted rather
              than faked: inert icons would imply interactivity that is not
              there, and their absence does not move the wordmark, which is
              centred by the flex layout either way. The 44px cart slot is kept
              so the row keeps its height on small screens.
            */}
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="inline-flex h-11 w-11 items-center justify-center -mr-2 sm:mr-0" aria-hidden="true" />
            </div>
          </div>
        </Container>
      </header>

      {/*
        Content region. It reserves viewport height so the footer cannot jump up
        into view, and the whole block is marked busy for assistive technology.
        No content skeleton is drawn: inventing product shapes that then change
        is the layout shift this component exists to prevent.
      */}
      <main className="flex-1 flex flex-col" aria-busy="true">
        <span className="sr-only">Loading page</span>
      </main>

      {/*
        Footer placeholder. This reserves the real footer's height rather than
        reproducing its content, and it is the one part of this fallback that is
        not pixel-exact: the live footer's height varies with viewport width
        while this is a fixed `min-height`, so the document can reflow slightly
        when the real footer mounts. That is accepted because the footer is
        below the fold on every storefront route, so the reflow is not visible
        during a navigation that starts at the top of the page.
      */}
      <footer
        aria-hidden="true"
        className="w-full min-h-[489px] bg-surface border-t border-border mt-auto"
      />
    </div>
  );
}
