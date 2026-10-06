"use client";

import React from "react";
import type { CatalogueProduct } from "@/lib/catalogue";
import { useStudio, useStudioProduct } from "@/lib/studio/hooks";
import { Sliders, Sparkles, EyeOff, Images } from "lucide-react";

interface ProductStudioStripProps {
  product: CatalogueProduct;
}

export function ProductStudioStrip({ product }: ProductStudioStripProps) {
  const { isEditing, openProductEditor, openImageManager } = useStudio();
  const merged = useStudioProduct(product);

  if (!isEditing) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Studio Mode Product Controls"
      className="p-3 bg-surface-subtle/50 border border-dashed border-accent/40 rounded-xs flex flex-col gap-2.5 my-2 animate-in fade-in-50 duration-150"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
          </span>
          <span className="truncate text-[10px] font-mono uppercase tracking-widest text-accent font-semibold">
            Studio Inspector
          </span>
        </div>

        <button
          type="button"
          onClick={() => openProductEditor(product.id)}
          className="touch-target -mr-1 inline-flex shrink-0 items-center justify-center gap-1 rounded-xs px-1.5 text-[10px] font-mono uppercase tracking-wider text-accent hover:underline cursor-pointer"
        >
          <Sliders className="w-3 h-3" />
          <span>Edit Product Form</span>
        </button>
      </div>

      {/* Attribute Chips.
          Every one of these opens the editor on a specific field, so on a touch
          screen they are the primary navigation — `touch-target` gives each a
          fingertip-sized hit area instead of the ~18px it had. */}
      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
        {/* Status */}
        <button
          type="button"
          onClick={() => openProductEditor(product.id, "active")}
          className="touch-target px-2 py-0.5 rounded-xs border border-border bg-surface text-foreground hover:border-accent transition-colors flex items-center gap-1 cursor-pointer"
        >
          {merged.isActive ? (
            <span className="text-emerald-600 dark:text-emerald-400">● Active</span>
          ) : (
            <span className="text-stone-500 flex items-center gap-0.5">
              <EyeOff className="w-2.5 h-2.5" /> Inactive
            </span>
          )}
        </button>

        {/* Featured */}
        {merged.featured && (
          <button
            type="button"
            onClick={() => openProductEditor(product.id, "featured")}
            className="touch-target px-2 py-0.5 rounded-xs border border-emerald-800/60 bg-emerald-950/20 text-emerald-600 dark:text-emerald-300 flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-2.5 h-2.5" /> Featured
          </button>
        )}

        {/* Shape */}
        <button
          type="button"
          onClick={() => openProductEditor(product.id, "shape")}
          className="touch-target px-2 py-0.5 rounded-xs border border-border bg-surface text-muted-foreground hover:text-foreground hover:border-accent transition-colors cursor-pointer"
        >
          Shape: <span className="text-foreground">{merged.shape || "Almond"}</span>
        </button>

        {/* Length */}
        <button
          type="button"
          onClick={() => openProductEditor(product.id, "length")}
          className="touch-target px-2 py-0.5 rounded-xs border border-border bg-surface text-muted-foreground hover:text-foreground hover:border-accent transition-colors cursor-pointer"
        >
          Length: <span className="text-foreground">{merged.length}</span>
        </button>

        {/* Finish */}
        <button
          type="button"
          onClick={() => openProductEditor(product.id, "finish")}
          className="touch-target px-2 py-0.5 rounded-xs border border-border bg-surface text-muted-foreground hover:text-foreground hover:border-accent transition-colors cursor-pointer"
        >
          Finish: <span className="text-foreground">{merged.finish}</span>
        </button>

        {/* Photos */}
        <button
          type="button"
          onClick={() => openImageManager(product.id)}
          className="touch-target px-2 py-0.5 rounded-xs border border-border bg-surface text-muted-foreground hover:text-accent hover:border-accent transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Images className="w-2.5 h-2.5 text-accent" />
          <span>{merged.images.length} Photos</span>
        </button>
      </div>
    </div>
  );
}
