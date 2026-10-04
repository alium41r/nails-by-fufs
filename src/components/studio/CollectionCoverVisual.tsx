"use client";

import React from "react";
import type { CatalogueCollection } from "@/lib/catalogue";
import { ImagePlaceholder } from "@/components/media/ImagePlaceholder";
import { useStudio, useStudioCollection } from "@/lib/studio/hooks";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollectionCoverVisualProps {
  collection: CatalogueCollection;
  ratio?: "wide" | "portrait" | "classic" | "square";
  className?: string;
}

export function CollectionCoverVisual({
  collection,
  ratio = "wide",
  className,
}: CollectionCoverVisualProps) {
  const merged = useStudioCollection(collection);
  const { isEditing, openCollectionEditor } = useStudio();

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-surface-subtle border border-border group/cover",
        className
      )}
    >
      <ImagePlaceholder
        ratio={ratio}
        src={merged.coverImageUrl}
        label={merged.imagePlaceholder.label}
        sublabel={merged.imagePlaceholder.sublabel}
        className="w-full max-h-[480px] shadow-xs"
      />

      {isEditing && (
        <div className="absolute top-3 right-3 z-30">
          <button
            type="button"
            onClick={() => openCollectionEditor(collection.slug, "cover")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider bg-stone-950/90 text-stone-100 hover:bg-accent hover:text-accent-foreground border border-stone-700/80 shadow-md backdrop-blur-xs rounded-xs transition-colors cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-accent" />
            <span>Edit Cover</span>
          </button>
        </div>
      )}
    </div>
  );
}
