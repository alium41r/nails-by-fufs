"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { siteConfig } from "@/config/site";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { X, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const prevPathname = useRef(pathname);
  const [mobileQuery, setMobileQuery] = useState("");

  // Close ONLY when pathname actually changes (not on initial mount or onClose identity change)
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      onClose();
    }
  }, [pathname, onClose]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const drawerLinks = [
    { label: "Shop", href: "/shop" },
    { label: "Collections", href: "/collections" },
    { label: "Custom", href: "/custom" },
    { label: "How It Works", href: "/how-it-works" },
    { label: "Size Guide", href: "/size-guide" },
    { label: "About", href: "/about" },
    { label: "FAQ", href: "/faq" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
      />

      {/* Drawer Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation Menu"
        className={cn(
          "relative z-10 h-full w-full max-w-xs sm:max-w-sm bg-surface border-r border-border",
          "p-6 flex flex-col justify-between shadow-2xl",
          "transition-transform duration-200 ease-out"
        )}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-6 border-b border-border">
          <Link href="/" onClick={onClose} className="inline-block">
            <span
              className={cn(
                "font-display font-light text-xl tracking-[0.18em] transition-colors",
                pathname === "/" ? "text-accent" : "text-foreground"
              )}
            >
              {siteConfig.name.toUpperCase()}
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="inline-flex h-11 w-11 items-center justify-center text-foreground hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile Search & Navigation */}
        <div className="flex-1 py-4 overflow-y-auto flex flex-col gap-5">
          {/* Drawer Search Box */}
          <div className="flex flex-col gap-2.5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (mobileQuery.trim()) {
                  router.push(`/search?q=${encodeURIComponent(mobileQuery.trim())}`);
                  onClose();
                }
              }}
              className="relative flex items-center"
            >
              <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={mobileQuery}
                onChange={(e) => setMobileQuery(e.target.value)}
                placeholder="Search press-on sets..."
                aria-label="Search sets in mobile menu"
                className={cn(
                  "w-full h-11 pl-9 pr-3 bg-surface-subtle/60 text-foreground placeholder:text-muted-foreground/60 text-xs font-sans",
                  "border border-border rounded-xs",
                  "focus-visible:outline-none focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent"
                )}
              />
            </form>

            {/* Curated Discovery Tags (3-4 items) */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mr-0.5">
                Explore:
              </span>
              {["Almond", "Cherry", "Glazed", "Core Edit"].map((tag) => (
                <Link
                  key={tag}
                  href={`/search?q=${encodeURIComponent(tag)}`}
                  onClick={onClose}
                  className="text-[10px] px-2 py-1 bg-surface-subtle text-foreground hover:text-accent border border-border/70 rounded-xs transition-colors"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>

          <div className="h-px bg-border/80" />

          {/* Drawer Navigation Links */}
          <nav className="flex flex-col gap-1" aria-label="Mobile Navigation">
            {drawerLinks.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "min-h-[44px] flex items-center px-3 text-sm font-medium tracking-[0.14em] uppercase transition-colors rounded-xs",
                    isActive
                      ? "text-accent font-semibold bg-accent-subtle/50"
                      : "text-foreground hover:text-accent hover:bg-surface-subtle"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Drawer Footer with Theme Toggle */}
        <div className="pt-6 border-t border-border flex flex-col gap-4">
          <ThemeToggle variant="pill" className="w-full justify-between" />

          <p className="text-[11px] text-muted-foreground tracking-wider uppercase">
            Bespoke Press-On Nail Studio
          </p>
        </div>
      </div>
    </div>
  );
}
