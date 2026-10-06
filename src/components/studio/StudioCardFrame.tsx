"use client";

import React from "react";
import { useStudio } from "@/lib/studio/hooks";
import { Edit3, AlertCircle, ImageOff, Sparkles, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudioCardFrameProps {
  entityType: "product" | "collection";
  id: string; // productId or collectionSlug
  name: string;
  isUnpriced?: boolean;
  isMissingImage?: boolean;
  isActive?: boolean;
  featured?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function StudioCardFrame({
  entityType,
  id,
  name,
  isUnpriced = false,
  isMissingImage = false,
  isActive = true,
  featured = false,
  children,
  className,
}: StudioCardFrameProps) {
  const { isEditing, openProductEditor, openCollectionEditor } = useStudio();

  /*
   * For a customer the card is exactly what it wraps — the frame is an editing
   * affordance and must add nothing. The exception is the same one `StudioContent`
   * and `StudioEditable` make: a `className` handed *in* belongs to the page, not
   * to the affordance, so it still has to be applied. `ProductCard` forwards its
   * own `className` here, and dropping it would silently detach a card from
   * whatever grid or sizing its caller placed it in.
   */
  if (!isEditing) {
    if (className === undefined) {
      return <>{children}</>;
    }
    return <div className={className}>{children}</div>;
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (entityType === "product") {
      openProductEditor(id);
    } else {
      openCollectionEditor(id);
    }
  };

  return (
    <div
      className={cn(
        "relative group/studio rounded-xs transition-all duration-150",
        "hover:ring-1 hover:ring-accent/60",
        className
      )}
    >
      {/* Existing Card Content */}
      {children}

      {/* Top Left Admin Status Badges */}
      <div className="absolute top-2 left-2 z-20 flex flex-col items-start gap-1 pointer-events-none select-none">
        {isUnpriced && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider bg-rose-950/90 text-rose-300 border border-rose-800/80 rounded-xs shadow-xs backdrop-blur-xs">
            <AlertCircle className="w-2.5 h-2.5 text-rose-400" />
            Unpriced
          </span>
        )}

        {isMissingImage && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider bg-rose-950/90 text-rose-300 border border-rose-800/80 rounded-xs shadow-xs backdrop-blur-xs">
            <ImageOff className="w-2.5 h-2.5 text-rose-400" />
            No Photo
          </span>
        )}

        {!isActive && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider bg-stone-900/90 text-stone-300 border border-stone-700 rounded-xs shadow-xs backdrop-blur-xs">
            <EyeOff className="w-2.5 h-2.5 text-stone-400" />
            Inactive
          </span>
        )}

        {featured && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider bg-emerald-950/90 text-emerald-300 border border-emerald-800/80 rounded-xs shadow-xs backdrop-blur-xs">
            <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
            Featured
          </span>
        )}
      </div>

      {/* Hover/Touch Floating Quick Edit Affordance */}
      <button
        type="button"
        onClick={handleEditClick}
        aria-label={`Studio Mode: Edit ${name}`}
        title={`Studio Mode: Edit ${name}`}
        className={cn(
          "absolute top-2 right-2 z-30 inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono uppercase tracking-wider",
          "bg-stone-950/90 text-stone-100 border border-stone-700/80 shadow-md backdrop-blur-xs rounded-xs",
          "hover:bg-accent hover:border-accent hover:text-accent-foreground transition-all duration-150 cursor-pointer",
          // Keep always visible on touch / mobile devices, reveal on hover for desktop
          "opacity-90 sm:opacity-0 sm:group-hover/studio:opacity-100 group-focus-within/studio:opacity-100"
        )}
      >
        <Edit3 className="w-3 h-3 text-accent group-hover/studio:text-inherit" />
        <span>Edit</span>
      </button>
    </div>
  );
}
