"use client";

import React from "react";
import { useStudio } from "@/lib/studio/hooks";
import { Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Visual-edit affordance for a product's or collection's own text.
 *
 * ## What it promises, and what it used to break
 *
 * Callers hand this component the text *and* the element and styling that text
 * should render as:
 *
 *     <StudioEditable as="h2" className="font-display text-3xl" …>{title}</StudioEditable>
 *
 * For a customer the affordance must disappear — but only the affordance. The
 * old `return <>{children}</>` dropped the element along with it, so on every
 * storefront page a collection `<h2>` became a bare text node with no class: no
 * serif face, no size, no margins, and — because the three of them landed in one
 * flex container — the tag, the title and the subtitle ran together as
 * "Core ReleaseThe Core EditEveryday Neutrals & Sheer Finishes".
 *
 * The admin never saw it, because the admin is the one visitor who gets the
 * wrapper. So the rule is now the same one `StudioContent` follows: a supplied
 * `className` is the page's styling and renders in both modes; a call that
 * supplies none is a pure affordance and still vanishes completely.
 *
 * The customer branch below is deliberately identical to the `editable={false}`
 * branch in `StudioText`, which is the rendering this component was always
 * supposed to degrade to.
 */
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
  as,
  inline = false,
  children,
  className,
}: StudioEditableProps) {
  const { isEditing, openProductEditor, openCollectionEditor } = useStudio();

  /** The element the caller asked for; a block container by default, as before. */
  const Element = as ?? "div";

  if (!isEditing) {
    // Nothing was handed over for the wrapper to carry: render the children
    // alone so the customer DOM stays exactly as it was.
    if (className === undefined) {
      return <>{children}</>;
    }
    return <Element className={className}>{children}</Element>;
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
    <Element
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

      {/* Floating edit badge.

          `hover-reveal` keeps it on screen where there is no hover to reveal it
          with: on a touch screen this badge is the only thing that says the text
          underneath can be edited at all, since `title` never appears and the
          hover outline never fires. Desktop is unchanged — the class only applies
          under `@media (hover: none)`. */}
      <button
        type="button"
        tabIndex={-1}
        className={cn(
          "studio-edit-trigger touch-target hover-reveal inline-flex items-center justify-center gap-1 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider",
          "bg-stone-950/90 text-stone-100 border border-stone-800 rounded-xs shadow-xs pointer-events-none select-none",
          "opacity-0 group-hover/editable:opacity-100 transition-opacity duration-150",
          inline ? "ml-1.5" : "absolute -top-2.5 right-0 z-20"
        )}
      >
        <Edit3 className="w-2.5 h-2.5 text-accent" />
        <span>{label || "Edit"}</span>
      </button>
    </Element>
  );
}
