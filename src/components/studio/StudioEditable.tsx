"use client";

import React from "react";
import { useStudio } from "@/lib/studio/hooks";
import { Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudioEditableProps {
  entityType: "product" | "collection";
  id: string; // productId or collectionSlug
  field: string;
  label?: string;
  as?: "div" | "span" | "p" | "h1" | "h2" | "h3";
  inline?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function StudioEditable({
  entityType,
  id,
  field,
  label,
  as: Component = "div",
  inline = false,
  children,
  className,
}: StudioEditableProps) {
  const { isEditing, openProductEditor, openCollectionEditor } = useStudio();

  if (!isEditing) {
    return <>{children}</>;
  }

  const handleClick = (e: React.MouseEvent) => {
    // If the click happened on an anchor/button inside, don't hijack unless it was the edit button
    const target = e.target as HTMLElement;
    if (target.closest("button.studio-edit-trigger") || target.closest(".studio-editable-zone")) {
      e.preventDefault();
      e.stopPropagation();

      if (entityType === "product") {
        openProductEditor(id, field);
      } else {
        openCollectionEditor(id, field);
      }
    }
  };

  return (
    <Component
      onClick={handleClick}
      className={cn(
        "studio-editable-zone relative group/editable transition-all duration-150 cursor-pointer",
        "hover:outline-dashed hover:outline-1 hover:outline-accent/60 hover:outline-offset-2 rounded-xs",
        inline ? "inline-flex items-center gap-1.5" : "block",
        className
      )}
      title={`Studio Mode: Edit ${label || field}`}
    >
      {children}

      {/* Floating hover badge */}
      <button
        type="button"
        tabIndex={-1}
        className={cn(
          "studio-edit-trigger inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider",
          "bg-stone-950/90 text-stone-100 border border-stone-800 rounded-xs shadow-xs pointer-events-none select-none",
          "opacity-0 group-hover/editable:opacity-100 transition-opacity duration-150",
          inline ? "ml-1.5" : "absolute -top-2.5 right-0 z-20"
        )}
      >
        <Edit3 className="w-2.5 h-2.5 text-accent" />
        <span>{label || "Edit"}</span>
      </button>
    </Component>
  );
}
