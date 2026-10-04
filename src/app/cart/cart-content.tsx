"use client";

import React from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { ImagePlaceholder } from "@/components/media/ImagePlaceholder";
import { useCart } from "@/providers/CartProvider";
import { Button } from "@/components/ui/Button";
import { Minus, Plus, Trash2, ArrowLeft, ArrowRight, ShoppingBag } from "lucide-react";

export function CartContent() {
  const { items, totalItems, subtotalPlaceholder, updateQuantity, removeItem } = useCart();

  return (
    <div className="py-10 sm:py-14 lg:py-18 bg-background">
      <Container size="wide">
        {items.length > 0 ? (
          <div className="flex flex-col gap-8 sm:gap-10 lg:gap-12">
            {/* Bag Header */}
            <div className="flex flex-col gap-2 border-b border-border pb-6">
              <span className="eyebrow text-accent tracking-[0.2em]">Studio Bag</span>
              <div className="flex items-baseline justify-between gap-4">
                <h1 className="font-display font-light text-3xl sm:text-4xl lg:text-5xl text-foreground tracking-tight">
                  Your bag
                </h1>
                <span className="text-xs sm:text-sm font-mono text-muted-foreground">
                  {totalItems} {totalItems === 1 ? "item" : "items"}
                </span>
              </div>
            </div>

            {/* Editorial Split: Items List (Left) & Order Summary (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 xl:gap-20 items-start">
              {/* Left Column: Bag Items */}
              <div className="lg:col-span-7 xl:col-span-8 flex flex-col divide-y divide-border">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="py-6 first:pt-0 last:pb-0 flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6"
                  >
                    {/* Product Thumbnail (4:5 Ratio) */}
                    <Link
                      href={`/product/${item.productSlug}`}
                      className="relative w-24 sm:w-28 shrink-0 overflow-hidden bg-surface-subtle border border-border/80 rounded-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent group"
                      aria-label={`View ${item.name}`}
                    >
                      <ImagePlaceholder
                        ratio="portrait"
                        label={item.imagePlaceholder.label}
                        sublabel={item.imagePlaceholder.sublabel}
                        interactive
                        className="w-full shadow-2xs"
                      />
                    </Link>

                    {/* Item Details */}
                    <div className="flex-1 flex flex-col gap-2 min-w-0 w-full">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Link
                            href={`/product/${item.productSlug}`}
                            className="font-display text-lg sm:text-xl text-foreground font-light hover:text-accent transition-colors line-clamp-1"
                          >
                            {item.name}
                          </Link>
                          <p className="text-xs text-muted-foreground font-sans">
                            {item.descriptor}
                          </p>
                        </div>
                        <span className="font-mono text-sm sm:text-base text-foreground font-medium shrink-0">
                          {item.price}
                        </span>
                      </div>

                      {/* Selected Configurations */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground font-mono">
                        <span className="px-2 py-0.5 bg-surface border border-border/60 rounded-xs">
                          Size: <strong className="text-foreground font-medium">{item.sizeLabel}</strong>
                        </span>
                        <span className="px-2 py-0.5 bg-surface border border-border/60 rounded-xs">
                          Length: <strong className="text-foreground font-medium">{item.length}</strong>
                        </span>
                        <span className="px-2 py-0.5 bg-surface border border-border/60 rounded-xs">
                          Shape: <strong className="text-foreground font-medium">{item.shape}</strong>
                        </span>
                      </div>

                      {/* Quantity Controls & Remove Action */}
                      <div className="flex items-center justify-between gap-4 pt-3 mt-1 border-t border-border/40">
                        {/* Quantity Stepper */}
                        <div className="flex items-center border border-border bg-surface h-9 px-2 rounded-xs">
                          <button
                            type="button"
                            aria-label={`Decrease quantity for ${item.name} (${item.sizeLabel}, ${item.length})`}
                            disabled={item.quantity <= 1}
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="h-7 w-7 inline-flex items-center justify-center text-foreground hover:text-accent disabled:opacity-30 cursor-pointer transition-colors"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="font-mono text-xs px-2 min-w-[24px] text-center text-foreground font-medium">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label={`Increase quantity for ${item.name} (${item.sizeLabel}, ${item.length})`}
                            disabled={item.quantity >= 10}
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="h-7 w-7 inline-flex items-center justify-center text-foreground hover:text-accent disabled:opacity-30 cursor-pointer transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          aria-label={`Remove ${item.name} (${item.sizeLabel}, ${item.length}) from bag`}
                          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-rose-600 transition-colors cursor-pointer py-1 px-2 rounded-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="text-[11px] uppercase tracking-wider">Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Continue Shopping Link at Bottom of Items */}
                <div className="pt-6">
                  <Link
                    href="/shop"
                    className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Continue Shopping</span>
                  </Link>
                </div>
              </div>

              {/* Right Column: Order Summary Panel */}
              <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-28">
                <div className="p-6 sm:p-8 bg-surface border border-border flex flex-col gap-6 rounded-xs">
                  <div className="flex flex-col gap-1 border-b border-border pb-4">
                    <span className="eyebrow text-accent">Order Summary</span>
                    <h2 className="font-display font-light text-2xl text-foreground">
                      Summary
                    </h2>
                  </div>

                  <div className="flex flex-col gap-3 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Total Items</span>
                      <span className="font-mono text-foreground font-medium">{totalItems}</span>
                    </div>

                    <div className="flex items-baseline justify-between border-t border-border pt-4 text-sm font-medium">
                      <span className="text-foreground uppercase tracking-wider text-xs">Subtotal</span>
                      <span className="font-mono text-base text-foreground font-semibold">
                        {subtotalPlaceholder}
                      </span>
                    </div>
                  </div>

                  {/* Non-functional Checkout Button Placeholder */}
                  <div className="flex flex-col gap-2 pt-2">
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      disabled
                      aria-disabled="true"
                      className="w-full min-h-[48px] text-xs uppercase tracking-[0.16em] opacity-80 cursor-not-allowed"
                    >
                      <span>Checkout</span>
                    </Button>
                    <p className="text-[11px] text-muted-foreground text-center font-sans">
                      Online checkout will be available in an upcoming release.
                    </p>
                  </div>

                  {/* Secondary Studio Link */}
                  <div className="pt-2 border-t border-border/60 text-center">
                    <Link
                      href="/custom"
                      className="text-[11px] text-muted-foreground hover:text-accent transition-colors"
                    >
                      Looking for custom artwork? <span className="underline underline-offset-4">Request a bespoke set</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Calm Empty Bag State */
          <div className="py-20 sm:py-28 text-center flex flex-col items-center gap-6 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-full bg-surface-subtle border border-border flex items-center justify-center text-muted-foreground">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div className="flex flex-col gap-2">
              <span className="eyebrow text-accent tracking-[0.2em]">Shopping Bag</span>
              <h1 className="font-display font-light text-3xl sm:text-4xl text-foreground tracking-tight">
                Your bag is empty.
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-sans">
                Explore the current collection of press-on sets.
              </p>
            </div>

            <div className="pt-2">
              <Button href="/shop" variant="primary" size="md" className="min-w-[200px]">
                <span>Explore Collection</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}
