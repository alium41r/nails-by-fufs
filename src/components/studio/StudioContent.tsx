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
 *
 * ## The one exception: a `className` the caller handed over
 *
 * "No wrapper" is only safe when the wrapper would have carried *nothing*. Most
 * call sites do not wrap this component in a styled element of their own — they
 * hand it the styles and expect it to be the element:
 *
 *     <StudioContent className="eyebrow text-accent tracking-[0.2em]">
 *
 * Dropping the wrapper there dropped the typography with it, for every customer:
 * every section eyebrow lost its uppercase, letter-spacing and accent colour, and
 * the hero's accent half-headline lost `italic text-accent block sm:inline` — so
 * the storefront's display type collapsed into unstyled body text while the admin
 * saw it correctly, because the admin is the only one who gets the wrapper.
 *
 * So the rule is now explicit: a supplied `className` is the page's styling, not
 * an affordance, and it is rendered in both modes. A call site that supplies
 * neither `as` nor `className` is a pure affordance and still vanishes completely.
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

export function StudioContent({ target, as, className, children }: StudioContentProps) {
  const { isEditing, openContentEditor } = useStudio();

  /** The element the caller asked for; inline by default, as before. */
  const Element = as ?? "span";

  if (!isEditing) {
    // No styling was handed over, so there is nothing the wrapper could be
    // holding up: render the children alone and leave the customer DOM as it was.
    if (className === undefined) {
      return <>{children}</>;
    }
    return <Element className={className}>{children}</Element>;
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
    <Element
      onClick={handleClick}
      className={cn(
        "relative group/studio-content transition-all duration-150",
        "hover:outline-dashed hover:outline-1 hover:outline-accent/60 hover:outline-offset-2 rounded-xs",
        className,
      )}
      title={`Studio Mode: edit ${target.label}`}
    >
      {children}
      {/*
        The edit trigger.

        It used to be `opacity-0` until hover, and the click handler on the wrapper
        only fires when the tap lands on *this* button — so on a touch screen the
        owner had to find an invisible target, and tapping the words themselves did
        nothing. `hover-reveal` makes the trigger permanently visible where hover
        does not exist; desktop still reveals it on hover only.
      */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        className={cn(
          "studio-content-trigger touch-target hover-reveal inline-flex items-center justify-center gap-1 px-1.5 py-0.5 ml-1.5 align-middle",
          "text-[9px] font-mono uppercase tracking-wider cursor-pointer",
          "bg-stone-950/90 text-stone-100 border border-stone-800 rounded-xs shadow-xs",
          "opacity-0 group-hover/studio-content:opacity-100 focus-visible:opacity-100 transition-opacity duration-150",
        )}
      >
        <Edit3 className="w-2.5 h-2.5 text-accent" />
        <span>{target.label}</span>
      </button>
    </Element>
  );
}
