"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X, ArrowRight } from "lucide-react";
import { searchProducts } from "@/lib/search";
import { Product } from "@/data/products";
import { cn } from "@/lib/utils";

export function HeaderSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Filter preview products in real-time (up to 4 items)
  const previewResults: Product[] = React.useMemo(() => {
    if (!query.trim()) return [];
    return searchProducts({ query }).slice(0, 4);
  }, [query]);

  // Total matching count
  const totalCount = React.useMemo(() => {
    if (!query.trim()) return 0;
    return searchProducts({ query }).length;
  }, [query]);

  const handleToggle = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (!next) {
        setQuery("");
      }
      return next;
    });
  };

  const handleClose = () => {
    setIsOpen(false);
    setQuery("");
  };

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      handleClose();
    }
  };

  const handleClear = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Search Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label={isOpen ? "Close search" : "Open studio search"}
        aria-expanded={isOpen}
        className={cn(
          "inline-flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center transition-colors rounded-xs select-none",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
          isOpen
            ? "text-accent bg-accent-subtle/50"
            : "text-foreground/80 hover:text-foreground"
        )}
      >
        <Search className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
      </button>

      {/* Understated Search Dropdown Popover */}
      {isOpen && (
        <div
          role="search"
          aria-label="Studio Search"
          className={cn(
            "fixed inset-x-3 top-20 z-50 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2",
            "w-auto sm:w-[380px] md:w-[420px]",
            "bg-surface border border-border shadow-xl p-4 flex flex-col gap-3 rounded-xs",
            "animate-in fade-in-50 duration-150"
          )}
        >
          {/* Search Input Form */}
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sets, finishes, shapes..."
              aria-label="Search sets"
              className={cn(
                "w-full h-11 pl-10 pr-9 bg-surface-subtle/50 text-foreground placeholder:text-muted-foreground/60 text-xs font-sans",
                "border border-border rounded-xs transition-colors",
                "focus-visible:outline-none focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent"
              )}
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear search input"
                className="absolute right-3 text-muted-foreground hover:text-foreground p-1"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </form>

          {/* Real-time Preview Results */}
          {query.trim() !== "" ? (
            <div className="flex flex-col gap-2 pt-1 border-t border-border">
              {previewResults.length > 0 ? (
                <>
                  <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
                    <span className="eyebrow text-accent text-[10px]">Sets</span>
                    <span>
                      {totalCount} {totalCount === 1 ? "match" : "matches"}
                    </span>
                  </div>

                  <div className="flex flex-col divide-y divide-border/60 max-h-[260px] overflow-y-auto">
                    {previewResults.map((product) => (
                      <Link
                        key={product.id}
                        href={`/product/${product.slug}`}
                        onClick={() => setIsOpen(false)}
                        className="group flex items-center justify-between gap-3 py-2.5 px-1.5 hover:bg-surface-subtle/60 transition-colors rounded-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Mini Thumbnail */}
                          <div className="w-10 h-12 shrink-0 bg-surface-subtle border border-border/80 flex items-center justify-center text-[8px] font-mono text-muted-foreground uppercase text-center p-1">
                            {product.shape}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-medium text-foreground group-hover:text-accent transition-colors truncate">
                              {product.name}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-sans truncate">
                              {product.descriptor}
                            </span>
                          </div>
                        </div>

                        <span className="text-xs font-mono text-muted-foreground shrink-0">
                          {product.price}
                        </span>
                      </Link>
                    ))}
                  </div>

                  {/* View All Results Action */}
                  <Link
                    href={`/search?q=${encodeURIComponent(query.trim())}`}
                    onClick={() => setIsOpen(false)}
                    className="mt-1 flex items-center justify-between p-2 text-xs font-medium text-accent hover:bg-accent-subtle/40 transition-colors border border-border/60 rounded-xs"
                  >
                    <span>View all {totalCount} results</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </>
              ) : (
                <div className="py-6 px-2 text-center flex flex-col items-center gap-1.5">
                  <p className="text-xs text-foreground font-medium">No sets found</p>
                  <p className="text-[11px] text-muted-foreground max-w-xs">
                    Press Enter to search or try &ldquo;Almond&rdquo;, &ldquo;Cherry&rdquo;, &ldquo;Glazed&rdquo;.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Quick discovery suggestions when input is empty */
            <div className="pt-2 border-t border-border flex flex-col gap-2">
              <span className="eyebrow text-[10px] text-muted-foreground px-1">
                Explore Edits & Shapes
              </span>
              <div className="flex flex-wrap gap-1.5">
                {["Almond", "Short Square", "Glazed", "Cherry", "The Core Edit"].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setQuery(tag);
                      inputRef.current?.focus();
                    }}
                    className="text-[11px] px-2.5 py-1 bg-surface-subtle hover:bg-surface-subtle/80 text-foreground border border-border/60 rounded-xs transition-colors cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
