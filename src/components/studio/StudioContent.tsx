"use client";

import React from "react";

import { useStudio } from "@/lib/studio/hooks";
import { Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Visual-edit affordance for owner-managed storefront content.
 *
 * The catalogue equivalent is `StudioEditable`, which opens a product or
 * collection editor. This one covers the other half of the storefront — hero
 * copy, section headings, gallery tiles, the announcement bar, policy and FAQ
 * prose — by pointing at a `site_content` document instead of a catalogue row.
 *
 * ## Visibility
 *
 * `useStudio().isEditing` is false for everyone except a signed-in admin inside
 * Studio Mode, and it is false on the server and in preview mode. When it is
 * false this renders `children` with **no wrapper element at all**, so a
 * customer's DOM is byte-for-byte what it was before this component existed and
 * no edit affordance is ever present in a customer preview.
 *
 * That property is load-bearing: the homepage layouts rely on flex/grid spacing,
 * and injecting an extra element around, say, a heading or an anchor would change
 * that spacing. Returning the children untouched is what makes "obvious to the
 * admin, invisible to the customer" true structurally rather than just visually.
 */
export interface StudioContentTarget {
  /**
   * The dotted `site_content` key this element renders, e.g. `home.hero`.
   * Must be one of `CONTENT_KEYS`, or the panel cannot open it.
   */
  key: string;
  /** Optional field to focus when the editor opens, e.g. `headline`. */
  field?: string;
  /** Human label for the hover affordance and the panel title. */
  label: string;
  /**
   * `inline` keeps the wrapper in the text flow (for a span inside a heading);
   * `block` is for headings and whole sections. Only matters while editing.
   */
  inline?: boolean;
}

interface StudioContentProps {
  target: StudioContentTarget;
  as?: "div" | "span";
  className?: string;
  children: React.ReactNode;
}

export function StudioContent({
  target,
  as: Component = "span",
  className,
  children,
}: StudioContentProps) {
  const { isEditing, openContentEditor } = useStudio();

  if (!isEditing) {
    return <>{children}</>;
  }

  const handleClick = (event: React.MouseEvent) => {
    // Only the affordance itself opens the editor. Clicking the surrounding
    // element must keep doing whatever it normally does — following the hero
    // CTA, opening the announcement link — or editing would make the storefront
    // untestable in place.
    const element = event.target as HTMLElement;
    if (!element.closest("button.studio-content-trigger")) return;
    event.preventDefault();
    event.stopPropagation();
    openContentEditor(target.key, target.field);
  };

  return (
    <Component
      onClick={handleClick}
      className={cn(
        "relative group/studio-content transition-all duration-150",
        "hover:outline-dashed hover:outline-1 hover:outline-accent/60 hover:outline-offset-2 rounded-xs",
        className,
      )}
      title={`Studio Mode: edit ${target.label}`}
    >
      {children}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        className={cn(
          "studio-content-trigger inline-flex items-center gap-1 px-1.5 py-0.5 ml-1.5 align-middle",
          "text-[9px] font-mono uppercase tracking-wider cursor-pointer",
          "bg-stone-950/90 text-stone-100 border border-stone-800 rounded-xs shadow-xs",
          "opacity-0 group-hover/studio-content:opacity-100 focus-visible:opacity-100 transition-opacity duration-150",
        )}
      >
        <Edit3 className="w-2.5 h-2.5 text-accent" />
        <span>{target.label}</span>
      </button>
    </Component>
  );
}
