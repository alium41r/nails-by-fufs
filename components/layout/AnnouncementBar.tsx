import React from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { Container } from "./Container";

export function AnnouncementBar() {
  const { announcement } = siteConfig;

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
        </div>
      </Container>
    </aside>
  );
}
