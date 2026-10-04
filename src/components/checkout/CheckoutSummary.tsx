"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronDown, ShoppingBag } from "lucide-react";
import type { CartItem } from "@/providers/CartProvider";
import { cn } from "@/lib/utils";

interface CheckoutSummaryProps {
  items: CartItem[];
  totalItems: number;
  /** Display-only total string. The authoritative total is computed server-side. */
  total: string;
  className?: string;
}

/**
 * Read-only order summary for checkout.
 *
 * Mobile: a collapsed bar showing the total that expands to the line items, so
 * the form stays the first thing in view. Desktop (lg+): always open and sticky
 * beside the form.
 *
 * Shipping, tax and discounts are intentionally absent — none are defined yet.
 */
export function CheckoutSummary({ items, totalItems, total, className }: CheckoutSummaryProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section
      aria-labelledby="checkout-summary-heading"
      className={cn("bg-surface border border-border rounded-xs", className)}
    >
      {/* Mobile disclosure bar */}
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls="checkout-summary-panel"
        className="lg:hidden w-full min-h-[56px] px-4 sm:px-5 flex items-center justify-between gap-4 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
      >
        <span className="inline-flex items-center gap-2.5 text-xs uppercase tracking-[0.16em] font-medium text-foreground">
          <ShoppingBag className="h-4 w-4 text-accent" aria-hidden="true" />
          <span>{isOpen ? "Hide order summary" : "Show order summary"}</span>
          <ChevronDown
            className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")}
            aria-hidden="true"
          />
        </span>
        <span className="font-mono text-sm font-semibold text-foreground">{total}</span>
      </button>

      <div
        id="checkout-summary-panel"
        className={cn(
          "p-4 sm:p-5 lg:p-8 border-t border-border lg:border-t-0 flex-col gap-6",
          isOpen ? "flex" : "hidden",
          "lg:flex",
        )}
      >
        {/* Desktop heading */}
        <div className="hidden lg:flex items-end justify-between gap-4 border-b border-border pb-4">
          <div className="flex flex-col gap-1">
            <span className="eyebrow text-accent">Your Order</span>
            <h2 id="checkout-summary-heading" className="font-display font-light text-2xl text-foreground">
              Order summary
            </h2>
          </div>
          <Link
            href="/cart"
            className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:text-accent underline underline-offset-4 decoration-border hover:decoration-accent transition-colors pb-1"
          >
            Edit bag
          </Link>
        </div>

        {/* Line items */}
        <ul className="flex flex-col divide-y divide-border/60" aria-label="Items in your order">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
              {/* Compact thumbnail with quantity badge */}
              <div className="relative w-16 shrink-0">
                <div className="aspect-[4/5] bg-surface-subtle border border-border/80 rounded-xs flex items-center justify-center">
                  <span className="font-display font-light text-2xl text-foreground/60" aria-hidden="true">
                    {item.name.charAt(0)}
                  </span>
                </div>
                <span className="absolute -top-2 -right-2 h-5 min-w-5 px-1 rounded-full bg-foreground text-background text-[10px] font-mono font-medium flex items-center justify-center">
                  <span className="sr-only">Quantity </span>
                  {item.quantity}
                </span>
              </div>

              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <span className="font-display text-lg leading-snug text-foreground font-light">{item.name}</span>
                <span className="text-[11px] text-muted-foreground font-mono leading-relaxed">
                  {item.sizeLabel} · {item.length} · {item.shape}
                </span>
              </div>

              <div className="shrink-0 flex flex-col items-end gap-0.5">
                <span className="font-mono text-sm text-foreground font-medium">{item.price}</span>
                {item.quantity > 1 && (
                  <span className="text-[10px] text-muted-foreground font-mono">each</span>
                )}
              </div>
            </li>
          ))}
        </ul>

        {/* Totals */}
        <div className="flex flex-col gap-3 border-t border-border pt-5 text-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Items</span>
            <span className="font-mono text-foreground font-medium">{totalItems}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-foreground uppercase tracking-wider text-xs font-medium">Total</span>
            <span className="font-mono text-lg text-foreground font-semibold">{total}</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed font-sans">
            Final pricing is confirmed when your order is placed.
          </p>
        </div>

        {/* Mobile-only edit link */}
        <div className="lg:hidden pt-1 border-t border-border/60 text-center">
          <Link
            href="/cart"
            className="inline-block pt-4 text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:text-accent underline underline-offset-4 decoration-border transition-colors"
          >
            Edit bag
          </Link>
        </div>
      </div>
    </section>
  );
}
