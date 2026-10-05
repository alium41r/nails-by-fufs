import React from "react";

import { cn } from "@/lib/utils";

/**
 * Form controls for the admin.
 *
 * Sentence-case labels and normal letter-spacing, unlike the storefront's
 * editorial uppercase. The storefront is read once and admired; the admin is
 * scanned repeatedly, and a form whose every label is uppercase, letter-spaced
 * and monospaced takes noticeably longer to read.
 *
 * These are plain server-renderable elements — no client hooks — so a form using
 * them stays a Server Component and keeps working without JavaScript for the
 * progressive-enhancement paths (every action here is a real `<form>` post).
 */

const CONTROL_BASE =
  "w-full rounded-md border bg-surface px-3 text-sm text-foreground transition-colors " +
  "placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:border-accent " +
  "focus-visible:ring-2 focus-visible:ring-accent/20 disabled:opacity-50";

export const controlClass = cn(CONTROL_BASE, "h-10 border-border");

/** A labelled field. The hint sits under the label, not under the input. */
export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
  optional = false,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
  /** Marks a field the owner can leave blank, so required ones stand out. */
  optional?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="flex items-baseline gap-2 text-[13px] font-medium text-foreground">
        {label}
        {optional && <span className="text-[11px] font-normal text-muted-foreground">optional</span>}
      </label>
      {hint && <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

export function TextInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(controlClass, className)} />;
}

export function TextArea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(controlClass, "h-auto resize-y py-2.5 leading-relaxed", className)}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cn(controlClass, "cursor-pointer pr-8", className)}>
      {children}
    </select>
  );
}

/** A checkbox with its label and an optional explanatory line. */
export function CheckboxField({
  name,
  label,
  description,
  defaultChecked,
}: {
  name: string;
  label: string;
  description?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border/70 p-3.5 transition-colors hover:bg-surface-subtle/60">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent)]"
      />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[13px] font-medium text-foreground">{label}</span>
        {description && (
          <span className="text-xs leading-relaxed text-muted-foreground">{description}</span>
        )}
      </span>
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/* Buttons                                                                     */
/* -------------------------------------------------------------------------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "attention";
type ButtonSize = "sm" | "md";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-foreground text-background hover:opacity-88",
  secondary: "border border-border bg-surface text-foreground hover:border-foreground/25 hover:bg-surface-subtle",
  ghost: "text-muted-foreground hover:bg-surface-subtle hover:text-foreground",
  // Reserved for genuinely irreversible actions.
  danger: "border border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40",
  // For retiring/hiding something — reversible, but worth pausing over.
  attention:
    "border border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-900/60 dark:text-amber-400 dark:hover:bg-amber-950/30",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-[13px]",
  // 44px: comfortable on touch, and the size most admin actions use.
  md: "h-10 px-4 text-[13px]",
};

export function adminButtonClass(variant: ButtonVariant = "secondary", size: ButtonSize = "md") {
  return cn(
    "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
    "disabled:pointer-events-none disabled:opacity-45",
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
  );
}

export function AdminButton({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button {...props} className={cn(adminButtonClass(variant, size), className)}>
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Actions menu                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The `•••` menu that holds a row's destructive and secondary actions.
 *
 * A native `<details>` so it needs no client JavaScript: duplicate, archive,
 * delete and move-collection live here instead of as four always-visible buttons
 * per row. `details`/`summary` is used rather than a popover library because the
 * menu is not positioned against a viewport and closes on the next click
 * anywhere via a `blur`-free native path — the list stays a Server Component.
 */
export function RowActionsMenu({
  label = "More actions",
  children,
  align = "right",
}: {
  label?: string;
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <details className="group relative shrink-0">
      <summary
        aria-label={label}
        title={label}
        className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-subtle hover:text-foreground"
      >
        <span aria-hidden="true" className="text-base leading-none tracking-widest">
          ···
        </span>
      </summary>
      <div
        className={cn(
          "absolute z-30 mt-1 w-52 rounded-lg border border-border bg-surface p-1.5 shadow-lg",
          align === "right" ? "right-0" : "left-0",
        )}
      >
        {children}
      </div>
    </details>
  );
}

/** A row inside a menu. Renders as a button or a link depending on `href`. */
export function MenuItem({
  children,
  tone = "default",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "default" | "danger" }) {
  return (
    <button
      type="submit"
      {...props}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors",
        tone === "danger"
          ? "text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
          : "text-foreground hover:bg-surface-subtle",
        props.className,
      )}
    >
      {children}
    </button>
  );
}
