import React from "react";
import Link from "next/link";

import { Container } from "./Container";
import { StudioContent } from "@/components/studio/StudioContent";
import type { AnnouncementContent } from "@/lib/site-content-schema";

/**
 * The announcement bar.
 *
 * Content comes in as a prop rather than from `@/config/site`, so the text, the
 * link and the enabled flag are owner-managed. The styling, the placement above
 * the header and the "uppercase via CSS" presentation are unchanged.
 *
 * Two states are supported exactly as before: with a link it is clickable, with
 * no link it is plain text. Clearing the link is a supported edit, not a broken
 * state, which is why the empty string is handled rather than treated as
 * missing.
 */
export function AnnouncementBar({ announcement }: { announcement: AnnouncementContent }) {
  if (!announcement.enabled || !announcement.text) {
    return null;
  }

  return (
    <aside
      aria-label="Announcement"
      className="w-full bg-surface-subtle border-b border-border text-foreground/85 transition-colors duration-150"
    >
      <Container size="wide">
        <div className="flex h-8 sm:h-9 items-center justify-center text-center px-2">
          <StudioContent
            target={{ key: "site.announcement", field: "text", label: "Announcement" }}
          >
            {announcement.href ? (
              <Link
                href={announcement.href}
                className="text-[10px] sm:text-[11px] font-medium tracking-[0.14em] uppercase text-foreground/80 hover:text-foreground hover:underline underline-offset-2 transition-colors"
              >
                {announcement.text}
              </Link>
            ) : (
              <span className="text-[10px] sm:text-[11px] font-medium tracking-[0.14em] uppercase text-foreground/80">
                {announcement.text}
              </span>
            )}
          </StudioContent>
        </div>
      </Container>
    </aside>
  );
}
