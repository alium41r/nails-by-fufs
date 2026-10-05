"use client";

import React, { useState } from "react";
import type { FaqCategoryContent, FaqItemContent } from "@/lib/site-content-schema";
import { ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The FAQ list.
 *
 * Items, categories and the closing note are props now rather than a module
 * import, because they are owner-managed (`page.faq`). The category ids are no
 * longer a closed TypeScript union either: an owner can add a category, so the
 * filter compares ids as strings.
 *
 * The first item still opens by default, keyed on whichever item is first rather
 * than the literal `"faq-1"` — the old hardcoded id meant renaming an item in the
 * database silently lost the default-open behaviour.
 */
export function FaqAccordion({
  items,
  categories,
  footerNote,
}: {
  items: FaqItemContent[];
  categories: FaqCategoryContent[];
  footerNote: string;
}) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [openItems, setOpenItems] = useState<Record<string, boolean>>(() =>
    items.length > 0 ? { [items[0].id]: true } : {},
  );

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredItems = items.filter((item) => {
    if (selectedCategory === "all") return true;
    return item.category === selectedCategory;
  });

  return (
    <div className="flex flex-col gap-8 w-full max-w-3xl mx-auto text-left">
      {/* Category Filter Tabs */}
      <div
        className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-border scrollbar-none"
        role="tablist"
        aria-label="FAQ Categories"
      >
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "text-[11px] uppercase tracking-[0.16em] px-3.5 py-1.5 transition-all duration-150 rounded-xs shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
                isSelected
                  ? "bg-foreground text-background font-medium"
                  : "text-muted-foreground hover:text-foreground bg-surface-subtle/50"
              )}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Accordion Item List */}
      <div className="flex flex-col divide-y divide-border border-y border-border">
        {filteredItems.map((item) => {
          const isOpen = !!openItems[item.id];
          const contentId = `faq-content-${item.id}`;
          const headerId = `faq-header-${item.id}`;

          return (
            <div key={item.id} className="group py-1">
              <h3>
                <button
                  id={headerId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={contentId}
                  onClick={() => toggleItem(item.id)}
                  className="w-full py-4.5 px-2 flex items-center justify-between gap-4 text-left transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent cursor-pointer select-none"
                >
                  <span className="font-display text-lg sm:text-xl text-foreground font-normal tracking-wide group-hover:text-accent transition-colors">
                    {item.question}
                  </span>
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full border border-border flex items-center justify-center shrink-0 text-muted-foreground transition-transform duration-200",
                      isOpen ? "rotate-180 bg-accent-subtle text-accent border-accent/40" : ""
                    )}
                    aria-hidden="true"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </div>
                </button>
              </h3>

              {isOpen && (
                <div
                  id={contentId}
                  role="region"
                  aria-labelledby={headerId}
                  className="px-2 pb-5 pt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed font-sans max-w-2xl animate-in fade-in-50 duration-150"
                >
                  <p>{item.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Subtle Studio Note */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
        <Sparkles className="h-3.5 w-3.5 text-accent shrink-0" />
        <span>{footerNote}</span>
      </div>
    </div>
  );
}
