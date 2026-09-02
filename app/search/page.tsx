"use client";

import React, { Suspense, useState, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/layout/Shell";
import { Container } from "@/components/layout/Container";
import { ProductCard } from "@/components/shop/ProductCard";
import { searchProducts, getDiscoveryTags } from "@/lib/search";
import { Button } from "@/components/ui/Button";
import { Search, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInnerProps {
  initialQuery: string;
}

function SearchInner({ initialQuery }: SearchInnerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [inputValue, setInputValue] = useState(initialQuery);

  const discoveryTags = useMemo(() => getDiscoveryTags(), []);

  // Filter products deterministically based on active query
  const matchingProducts = useMemo(() => {
    if (!initialQuery.trim()) return [];
    return searchProducts({ query: initialQuery.trim() });
  }, [initialQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed) {
      router.replace(`${pathname}?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.replace(pathname);
    }
  };

  const handleClearQuery = () => {
    setInputValue("");
    router.replace(pathname);
  };

  const handleSelectTag = (tag: string) => {
    setInputValue(tag);
    router.replace(`${pathname}?q=${encodeURIComponent(tag)}`);
  };

  return (
    <div className="py-10 sm:py-14 lg:py-18 bg-background">
      <Container size="wide">
        <div className="flex flex-col gap-10 sm:gap-14">
          {/* Search Header & Input Box */}
          <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full text-center">
            <div className="flex flex-col gap-2">
              <span className="eyebrow text-accent tracking-[0.2em]">Studio Search</span>
              <h1 className="font-display font-light text-3xl sm:text-4xl lg:text-5xl text-foreground tracking-tight text-balance">
                {initialQuery.trim() ? (
                  <>Results for &ldquo;{initialQuery}&rdquo;</>
                ) : (
                  <>Search the Studio</>
                )}
              </h1>
              {initialQuery.trim() && (
                <p className="text-xs font-mono text-muted-foreground">
                  {matchingProducts.length}{" "}
                  {matchingProducts.length === 1 ? "set found" : "sets found"}
                </p>
              )}
            </div>

            {/* Accessible Search Input Field */}
            <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full">
              <Search className="absolute left-4 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Search by finish, shape (e.g. Almond), or collection..."
                aria-label="Search press-on sets"
                className={cn(
                  "w-full h-12 sm:h-13 pl-11 pr-10 bg-surface text-foreground placeholder:text-muted-foreground/60 text-xs sm:text-sm font-sans",
                  "border border-border rounded-xs shadow-xs transition-colors",
                  "focus-visible:outline-none focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent"
                )}
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={handleClearQuery}
                  aria-label="Clear search input"
                  className="absolute right-3.5 text-muted-foreground hover:text-foreground p-1 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </form>

            {/* Curated Discovery Tags */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground mr-1">
                Explore:
              </span>
              {discoveryTags.map((tag) => {
                const isActive = initialQuery.toLowerCase() === tag.toLowerCase();
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleSelectTag(tag)}
                    className={cn(
                      "text-[11px] uppercase tracking-wider px-3 py-1 rounded-xs transition-colors cursor-pointer border",
                      isActive
                        ? "bg-foreground text-background border-foreground font-medium"
                        : "bg-surface text-foreground border-border hover:border-accent hover:text-accent"
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Content Display */}
          {initialQuery.trim() !== "" ? (
            matchingProducts.length > 0 ? (
              /* Results Grid */
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="eyebrow text-accent">Matching Handcrafted Sets</span>
                  <Link
                    href="/shop"
                    className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span>View All in Shop</span>
                    <ArrowRight className="h-3.5 w-3.5 text-accent" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
                  {matchingProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            ) : (
              /* Calm No-Results State */
              <div className="py-16 sm:py-20 text-center flex flex-col items-center gap-5 bg-surface-subtle/30 border border-border p-8 rounded-xs max-w-xl mx-auto w-full">
                <span className="eyebrow text-accent">No Sets Found</span>
                <h2 className="font-display font-light text-2xl sm:text-3xl text-foreground">
                  No sets found for &ldquo;{initialQuery}&rdquo;
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm leading-relaxed">
                  We couldn&apos;t find any sets matching your query. Try searching for a specific nail shape (e.g. Almond, Oval), finish (e.g. Glazed, Velvet), or collection name.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <Button variant="outline" size="sm" onClick={handleClearQuery}>
                    Clear Search
                  </Button>
                  <Button href="/shop" variant="primary" size="sm">
                    Browse All Sets
                  </Button>
                </div>
              </div>
            )
          ) : (
            /* Empty Query State */
            <div className="py-12 text-center flex flex-col items-center gap-6 max-w-lg mx-auto">
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Discover our handcrafted press-on sets by shape, finish, or collection edit.
              </p>
              <Button href="/shop" variant="outline" size="md">
                Browse Full Catalog
              </Button>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}

function SearchContentWrapper() {
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") || "";

  return <SearchInner key={urlQuery} initialQuery={urlQuery} />;
}

export default function SearchPage() {
  return (
    <Shell>
      <Suspense fallback={<div className="min-h-[50vh] bg-background" />}>
        <SearchContentWrapper />
      </Suspense>
    </Shell>
  );
}
