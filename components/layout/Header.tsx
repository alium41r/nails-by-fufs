"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/config/site";
import { Container } from "./Container";
import { MobileDrawer } from "./MobileDrawer";
import { HeaderSearch } from "./HeaderSearch";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useCart } from "@/providers/CartProvider";
import { Menu, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

export function Header() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const { totalItems } = useCart();

  const handleOpenDrawer = React.useCallback(() => {
    setDrawerOpen(true);
  }, []);

  const handleCloseDrawer = React.useCallback(() => {
    setDrawerOpen(false);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-surface border-b border-border transition-colors duration-150">
        <Container size="wide">
          <div className="flex h-16 sm:h-20 items-center justify-between">
            {/* Mobile Menu Trigger */}
            <div className="flex items-center lg:hidden">
              <button
                type="button"
                onClick={handleOpenDrawer}
                aria-label="Open navigation menu"
                className="inline-flex h-11 w-11 items-center justify-center text-foreground hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent -ml-2 cursor-pointer"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>

            {/* Desktop Navigation Links (Left) */}
            <nav className="hidden lg:flex items-center gap-5 xl:gap-7" aria-label="Main Navigation">
              {siteConfig.mainNav.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "text-xs uppercase tracking-[0.16em] transition-colors",
                      isActive
                        ? "text-accent font-semibold"
                        : "text-foreground/80 hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Brand Wordmark (Center on Desktop and Mobile) */}
            <div className="text-center">
              <Link href="/" className="inline-block group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent">
                <span
                  className={cn(
                    "font-display font-light text-xl sm:text-2xl lg:text-3xl tracking-[0.2em] transition-colors group-hover:opacity-85",
                    pathname === "/" ? "text-accent font-normal" : "text-foreground"
                  )}
                >
                  {siteConfig.name.toUpperCase()}
                </span>
                <span className="hidden sm:block text-[9px] uppercase tracking-[0.28em] text-muted-foreground -mt-0.5">
                  {siteConfig.shortName.toUpperCase()} • Press-On Studio
                </span>
              </Link>
            </div>

            {/* Desktop Utility Actions & Mobile Cart */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Search (Desktop & Tablet) */}
              <div className="flex items-center">
                <HeaderSearch />
              </div>

              {/* Theme Toggle (Desktop) */}
              <div className="hidden lg:flex items-center">
                <ThemeToggle />
              </div>

              {/* Cart Button (Always visible) */}
              <Link
                href="/cart"
                aria-label={`Shopping Bag, ${totalItems} ${totalItems === 1 ? "item" : "items"}`}
                className="relative inline-flex h-11 w-11 items-center justify-center text-foreground hover:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent -mr-2 sm:mr-0"
              >
                <ShoppingBag className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute top-2 right-2 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-accent text-accent-foreground text-[10px] font-mono font-semibold leading-none shadow-xs">
                    {totalItems}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </Container>
      </header>

      {/* Mobile Navigation Drawer */}
      <MobileDrawer isOpen={drawerOpen} onClose={handleCloseDrawer} />
    </>
  );
}
