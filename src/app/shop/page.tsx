"use client";

import React, { Suspense, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { Container } from "@/components/layout/Container";
import { ProductCard } from "@/components/shop/ProductCard";
import { products } from "@/data/products";
import { collections } from "@/data/collections";
import { searchProducts, getAvailableShapes, getAvailableLengths } from "@/lib/search";
import { Button } from "@/components/ui/Button";
import { Sparkles, X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

function ShopContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read active filters and sort from URL search params
  const selectedCollection = searchParams.get("collection") || "all";
  const selectedShape = searchParams.get("shape") || "all";
  const selectedLength = searchParams.get("length") || "all";
  const sortBy = (searchParams.get("sort") as "featured" | "newest" | "name") || "featured";

  const availableShapes = useMemo(() => ["all", ...getAvailableShapes()], []);
  const availableLengths = useMemo(() => ["all", ...getAvailableLengths()], []);

  // Update URL params helper
  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === "all" || (key === "sort" && value === "featured")) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    const queryString = params.toString();
    router.replace(`${pathname}${queryString ? `?${queryString}` : ""}`, { scroll: false });
  };

  const filteredProducts = useMemo(() => {
    return searchProducts({
      collection: selectedCollection,
      shape: selectedShape,
      length: selectedLength,
      sortBy: sortBy,
    });
  }, [selectedCollection, selectedShape, selectedLength, sortBy]);

  const hasActiveFilters =
    selectedCollection !== "all" || selectedShape !== "all" || selectedLength !== "all";

  const handleResetFilters = () => {
    const params = new URLSearchParams();
    if (sortBy !== "featured") {
      params.set("sort", sortBy);
    }
    const queryString = params.toString();
    router.replace(`${pathname}${queryString ? `?${queryString}` : ""}`, { scroll: false });
  };

  return (
    <div className="py-10 sm:py-14 lg:py-18 bg-background">
      <Container size="wide">
        <div className="flex flex-col gap-8 sm:gap-10 lg:gap-12">
          {/* Shop Hero Section */}
          <div className="flex flex-col gap-3 max-w-xl">
            <span className="eyebrow text-accent tracking-[0.2em]">The Studio Collection</span>
            <h1 className="font-display font-light text-4xl sm:text-5xl lg:text-6xl text-foreground tracking-tight text-balance">
              Find your set.
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed font-sans max-w-md">
              Explore the current edit of press-on sets.
            </p>
          </div>

          {/* Minimal Editorial Filter Strip */}
          <div className="flex flex-col gap-4 border-y border-border py-4">
            {/* Top Filter Row: Collection Tabs + Desktop Dropdowns */}
            <div className="flex items-center justify-between gap-4">
              {/* Collection Pills (Horizontal scrollable on mobile) */}
              <div
                className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none"
                role="tablist"
                aria-label="Collections"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedCollection === "all"}
                  onClick={() => updateParams({ collection: "all" })}
                  className={cn(
                    "text-[11px] uppercase tracking-[0.14em] px-3.5 py-1.5 transition-all duration-150 rounded-xs shrink-0 cursor-pointer",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
                    selectedCollection === "all"
                      ? "bg-foreground text-background font-medium"
                      : "text-muted-foreground hover:text-foreground bg-surface-subtle/50"
                  )}
                >
                  All Sets ({products.length})
                </button>

                {collections.map((col) => {
                  const isSelected = selectedCollection === col.slug;
                  return (
                    <button
                      key={col.slug}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => updateParams({ collection: col.slug })}
                      className={cn(
                        "text-[11px] uppercase tracking-[0.14em] px-3.5 py-1.5 transition-all duration-150 rounded-xs shrink-0 cursor-pointer",
                        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
                        isSelected
                          ? "bg-foreground text-background font-medium"
                          : "text-muted-foreground hover:text-foreground bg-surface-subtle/50"
                      )}
                    >
                      {col.title.split("—")[0].trim()}
                    </button>
                  );
                })}
              </div>

              {/* Desktop Filters (Shape, Length, Sort) */}
              <div className="hidden lg:flex items-center gap-4 text-xs shrink-0">
                {/* Shape Filter */}
                <div className="flex items-center gap-1.5">
                  <label htmlFor="desktop-shape-filter" className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Shape:
                  </label>
                  <select
                    id="desktop-shape-filter"
                    value={selectedShape}
                    onChange={(e) => updateParams({ shape: e.target.value })}
                    aria-label="Filter by nail shape"
                    className="bg-surface border border-border text-foreground text-xs px-2.5 py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent cursor-pointer rounded-xs"
                  >
                    <option value="all">All Shapes</option>
                    {availableShapes
                      .filter((s) => s !== "all")
                      .map((shape) => (
                        <option key={shape} value={shape}>
                          {shape}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Length Filter */}
                <div className="flex items-center gap-1.5">
                  <label htmlFor="desktop-length-filter" className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Length:
                  </label>
                  <select
                    id="desktop-length-filter"
                    value={selectedLength}
                    onChange={(e) => updateParams({ length: e.target.value })}
                    aria-label="Filter by nail length"
                    className="bg-surface border border-border text-foreground text-xs px-2.5 py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent cursor-pointer rounded-xs"
                  >
                    <option value="all">All Lengths</option>
                    {availableLengths
                      .filter((l) => l !== "all")
                      .map((len) => (
                        <option key={len} value={len}>
                          {len}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Sort Control */}
                <div className="flex items-center gap-1.5">
                  <label htmlFor="desktop-sort-filter" className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Sort:
                  </label>
                  <select
                    id="desktop-sort-filter"
                    value={sortBy}
                    onChange={(e) => updateParams({ sort: e.target.value })}
                    aria-label="Sort product list"
                    className="bg-surface border border-border text-foreground text-xs px-2.5 py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent cursor-pointer rounded-xs"
                  >
                    <option value="featured">Featured First</option>
                    <option value="newest">Newest</option>
                    <option value="name">Alphabetical (A–Z)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Mobile / Tablet Filter Controls Row */}
            <div className="flex lg:hidden flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-border/60">
              <div className="flex items-center gap-2 flex-wrap">
                <SlidersHorizontal className="h-3.5 w-3.5 text-accent shrink-0" />

                {/* Mobile Shape Dropdown */}
                <select
                  value={selectedShape}
                  onChange={(e) => updateParams({ shape: e.target.value })}
                  aria-label="Filter by nail shape on mobile"
                  className="bg-surface border border-border text-foreground text-xs px-2.5 py-1.5 rounded-xs"
                >
                  <option value="all">All Shapes</option>
                  {availableShapes
                    .filter((s) => s !== "all")
                    .map((shape) => (
                      <option key={shape} value={shape}>
                        {shape}
                      </option>
                    ))}
                </select>

                {/* Mobile Length Dropdown */}
                <select
                  value={selectedLength}
                  onChange={(e) => updateParams({ length: e.target.value })}
                  aria-label="Filter by nail length on mobile"
                  className="bg-surface border border-border text-foreground text-xs px-2.5 py-1.5 rounded-xs"
                >
                  <option value="all">All Lengths</option>
                  {availableLengths
                    .filter((l) => l !== "all")
                    .map((len) => (
                      <option key={len} value={len}>
                        {len}
                      </option>
                    ))}
                </select>

                {/* Mobile Sort Dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => updateParams({ sort: e.target.value })}
                  aria-label="Sort products on mobile"
                  className="bg-surface border border-border text-foreground text-xs px-2.5 py-1.5 rounded-xs"
                >
                  <option value="featured">Featured</option>
                  <option value="newest">Newest</option>
                  <option value="name">A–Z</option>
                </select>
              </div>

              <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                {filteredProducts.length} {filteredProducts.length === 1 ? "set" : "sets"}
              </span>
            </div>
          </div>

          {/* Active Filter Chips & Clear Action */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center justify-between gap-2 -mt-3 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground mr-1">
                  Active Filters:
                </span>
                {selectedCollection !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-subtle border border-border text-[11px] text-foreground rounded-xs">
                    <span>
                      Collection: {collections.find((c) => c.slug === selectedCollection)?.title.split("—")[0].trim() || selectedCollection}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateParams({ collection: "all" })}
                      aria-label="Remove collection filter"
                      className="hover:text-accent p-0.5 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedShape !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-subtle border border-border text-[11px] text-foreground rounded-xs">
                    <span>Shape: {selectedShape}</span>
                    <button
                      type="button"
                      onClick={() => updateParams({ shape: "all" })}
                      aria-label="Remove shape filter"
                      className="hover:text-accent p-0.5 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedLength !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-subtle border border-border text-[11px] text-foreground rounded-xs">
                    <span>Length: {selectedLength}</span>
                    <button
                      type="button"
                      onClick={() => updateParams({ length: "all" })}
                      aria-label="Remove length filter"
                      className="hover:text-accent p-0.5 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-accent underline underline-offset-4 hover:opacity-80 cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          )}

          {/* Product Grid: 4 columns desktop, 2 columns mobile */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            /* Calm Empty State */
            <div className="py-20 text-center flex flex-col items-center gap-4 bg-surface-subtle/30 border border-border p-8 rounded-xs">
              <span className="eyebrow text-accent">No Matches</span>
              <h2 className="font-display font-light text-2xl sm:text-3xl text-foreground">
                Nothing here yet.
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-sm">
                No handcrafted sets match your selected filters. Try resetting your filters to explore our full collection.
              </p>
              <div className="pt-2">
                <Button variant="outline" size="sm" onClick={handleResetFilters}>
                  Reset Filters
                </Button>
              </div>
            </div>
          )}

          {/* Bespoke Commission Banner */}
          <div className="mt-8 p-6 sm:p-8 lg:p-10 border border-border bg-surface-subtle/20 flex flex-col sm:flex-row items-center justify-between gap-6 rounded-xs">
            <div className="flex flex-col gap-1.5 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 text-accent text-xs justify-center sm:justify-start">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="eyebrow text-accent">Bespoke Orders</span>
              </div>
              <h3 className="font-display text-xl sm:text-2xl text-foreground font-light">
                Looking for a custom concept?
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md">
                Work directly with Fufs to request a bespoke set designed specifically for your event or aesthetic.
              </p>
            </div>

            <Button href="/custom" variant="outline" size="md" className="shrink-0">
              Request Custom Set
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
}

export default function ShopPage() {
  return (
    <Shell>
      <Suspense fallback={<div className="min-h-[50vh] bg-background" />}>
        <ShopContent />
      </Suspense>
    </Shell>
  );
}
