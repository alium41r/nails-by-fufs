"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import type { CatalogueProduct } from "@/lib/catalogue";
import { useCart } from "@/providers/CartProvider";
import { Check, Info, Minus, Plus, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProductOptionsProps {
  product: CatalogueProduct;
}

const AVAILABLE_SIZES = [
  { id: "xs", label: "XS", desc: "14 / 10 / 11 / 10 / 8 mm" },
  { id: "s", label: "S", desc: "15 / 11 / 12 / 11 / 9 mm" },
  { id: "m", label: "M", desc: "16 / 12 / 13 / 12 / 10 mm" },
  { id: "l", label: "L", desc: "17 / 13 / 14 / 13 / 11 mm" },
  { id: "custom", label: "Custom", desc: "Enter your exact sizes" },
];

const AVAILABLE_LENGTHS = ["Short", "Medium", "Long"] as const;

export function ProductOptions({ product }: ProductOptionsProps) {
  const { addItem } = useCart();
  const [selectedSize, setSelectedSize] = useState("m");
  const [selectedLength, setSelectedLength] = useState<string>(product.length || "Medium");
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCart = () => {
    addItem(product, selectedSize, selectedLength, quantity);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 4000);
  };

  return (
    <div className="flex flex-col gap-6 pt-2">
      {/* Sizing Selector */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs uppercase tracking-[0.16em] font-medium text-foreground">
            Size: <span className="font-normal text-muted-foreground">{selectedSize.toUpperCase()}</span>
          </label>
          <Link
            href="/size-guide"
            className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            <Info className="h-3 w-3" />
            <span>Size Guide</span>
          </Link>
        </div>

        <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Nail Size">
          {AVAILABLE_SIZES.map((size) => {
            const isSelected = size.id === selectedSize;
            return (
              <button
                key={size.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelectedSize(size.id)}
                className={cn(
                  "h-11 border text-xs font-mono uppercase tracking-wider transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent cursor-pointer flex flex-col items-center justify-center rounded-xs",
                  isSelected
                    ? "border-accent bg-accent-subtle text-accent font-semibold"
                    : "border-border bg-surface text-foreground hover:border-foreground/40"
                )}
              >
                <span>{size.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Length Preference */}
      <div className="flex flex-col gap-2.5">
        <label className="text-xs uppercase tracking-[0.16em] font-medium text-foreground">
          Length: <span className="font-normal text-muted-foreground">{selectedLength}</span>
        </label>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Nail Length">
          {AVAILABLE_LENGTHS.map((len) => {
            const isSelected = len === selectedLength;
            return (
              <button
                key={len}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelectedLength(len)}
                className={cn(
                  "h-10 border text-xs uppercase tracking-[0.14em] transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent cursor-pointer flex items-center justify-center rounded-xs",
                  isSelected
                    ? "border-accent bg-accent-subtle text-accent font-semibold"
                    : "border-border bg-surface text-foreground hover:border-foreground/40"
                )}
              >
                <span>{len}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quantity and Add to Bag Button */}
      <div className="flex flex-col gap-2.5 pt-2">
        <div className="flex flex-col sm:flex-row items-stretch gap-3">
          {/* Quantity Controls */}
          <div className="flex items-center justify-between border border-border bg-surface h-12 px-3 w-full sm:w-32 shrink-0 rounded-xs">
            <button
              type="button"
              aria-label={`Decrease quantity for ${product.name}`}
              disabled={quantity <= 1}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="h-8 w-8 inline-flex items-center justify-center text-foreground hover:text-accent disabled:opacity-30 cursor-pointer"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="font-mono text-xs font-medium text-foreground">
              {quantity}
            </span>
            <button
              type="button"
              aria-label={`Increase quantity for ${product.name}`}
              disabled={quantity >= 10}
              onClick={() => setQuantity((q) => Math.min(10, q + 1))}
              className="h-8 w-8 inline-flex items-center justify-center text-foreground hover:text-accent disabled:opacity-30 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Primary Add to Cart CTA */}
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={handleAddToCart}
            className="flex-1 min-h-[48px] text-xs uppercase tracking-[0.16em]"
          >
            {isAdded ? (
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4" />
                Added to Bag
              </span>
            ) : (
              `Add to Bag • ${product.price}`
            )}
          </Button>
        </div>

        {/* Calm Post-Add Action Row */}
        {isAdded && (
          <div className="flex items-center justify-between px-1 py-1.5 text-xs animate-in fade-in-50 duration-150">
            <span className="text-accent font-medium">Item added to your bag</span>
            <Link
              href="/cart"
              className="inline-flex items-center gap-1 text-accent font-medium hover:underline"
            >
              <span>View Bag</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>

      {/* Secondary Custom Commission Note */}
      <div className="pt-1">
        <Link
          href="/custom"
          className="block text-center sm:text-left text-[11px] text-muted-foreground hover:text-accent transition-colors"
        >
          Need a specific length, custom art, or custom sizing? <span className="underline underline-offset-4">Request a custom set</span>
        </Link>
      </div>
    </div>
  );
}
