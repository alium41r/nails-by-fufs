import React from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FieldWrapperProps {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

export function StudioField({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: FieldWrapperProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label
          htmlFor={htmlFor}
          className="text-[11px] uppercase tracking-wider font-mono text-muted-foreground select-none"
        >
          {label}
        </label>
        {hint && (
          <span className="text-[10px] text-muted-foreground/80 font-sans">
            {hint}
          </span>
        )}
      </div>
      {children}
      {error && <span className="text-[11px] text-rose-500 font-sans">{error}</span>}
    </div>
  );
}

export interface StudioInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const StudioInput = React.forwardRef<HTMLInputElement, StudioInputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-10 px-3 bg-background border border-border text-sm text-foreground w-full rounded-xs transition-colors",
          "placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:border-accent",
          error && "border-rose-400 focus-visible:ring-rose-400",
          className
        )}
        {...props}
      />
    );
  }
);
StudioInput.displayName = "StudioInput";

export interface StudioTextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const StudioTextArea = React.forwardRef<
  HTMLTextAreaElement,
  StudioTextAreaProps
>(({ className, error, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "px-3 py-2 bg-background border border-border text-sm text-foreground w-full rounded-xs transition-colors resize-y min-h-[90px]",
        "placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:border-accent font-sans leading-relaxed",
        error && "border-rose-400 focus-visible:ring-rose-400",
        className
      )}
      {...props}
    />
  );
});
StudioTextArea.displayName = "StudioTextArea";

export interface StudioSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const StudioSelect = React.forwardRef<
  HTMLSelectElement,
  StudioSelectProps
>(({ className, error, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        "h-10 px-3 bg-background border border-border text-sm text-foreground w-full rounded-xs transition-colors cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:border-accent",
        error && "border-rose-400 focus-visible:ring-rose-400",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});
StudioSelect.displayName = "StudioSelect";

interface StudioSwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
}

export function StudioSwitch({
  label,
  description,
  checked,
  onChange,
  id,
  disabled,
}: StudioSwitchProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex items-start justify-between gap-4 p-3 border border-border bg-surface-subtle/30 rounded-xs cursor-pointer select-none transition-colors",
        disabled && "opacity-50 cursor-not-allowed",
        "hover:border-foreground/30"
      )}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium text-foreground tracking-wide">
          {label}
        </span>
        {description && (
          <span className="text-[11px] text-muted-foreground leading-normal">
            {description}
          </span>
        )}
      </div>

      <input
        type="checkbox"
        id={id}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <div
        className={cn(
          "w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out shrink-0 mt-0.5",
          checked ? "bg-accent" : "bg-muted"
        )}
      >
        <div
          className={cn(
            "w-4 h-4 rounded-full bg-surface shadow-xs transition-transform duration-200 ease-in-out",
            checked ? "translate-x-4" : "translate-x-0"
          )}
        />
      </div>
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/* Plain-content form controls                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Sentence-case controls for the Studio content panel.
 *
 * The existing exports above are the catalogue editor's monospace field set,
 * which suits a dense product form but is the wrong voice for editing prose on a
 * homepage. These are the same shapes as the Control Center's controls, kept
 * local so the Studio bundle does not pull in the admin UI module.
 */

export function ContentField({
  label,
  hint,
  htmlFor,
  optional = false,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="flex items-baseline gap-2 text-[13px] font-medium text-foreground">
        {label}
        {optional && <span className="text-[11px] font-normal text-muted-foreground">optional</span>}
      </label>
      {hint && <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

const contentInput =
  "w-full rounded-md border border-border bg-background px-3 text-sm text-foreground " +
  "placeholder:text-muted-foreground/60 transition-colors focus-visible:border-accent " +
  "focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:outline-none";

export function ContentInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(contentInput, "h-10", className)} />;
}

export function ContentTextArea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(contentInput, "resize-y py-2.5 leading-relaxed", className)}
    />
  );
}

export function ContentSelect({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cn(contentInput, "h-10 cursor-pointer pr-8", className)}>
      {children}
    </select>
  );
}

/**
 * A "one entry per row" list.
 *
 * The stored shape is an array of strings, which is how `intro` paragraphs and
 * `included` items work. Shown as a stack of single-line inputs with remove and
 * add, because a textarea would hide the one-per-row contract and make an
 * accidental blank line look like a deliberate empty item.
 */
export function ContentStringList({
  values,
  onChange,
  placeholder,
  addLabel,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  addLabel: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      {values.map((value, index) => (
        <div key={index} className="flex items-start gap-2">
          <ContentTextArea
            value={value}
            rows={2}
            placeholder={placeholder}
            aria-label={`${addLabel} ${index + 1}`}
            onChange={(event) => {
              const next = [...values];
              next[index] = event.target.value;
              onChange(next);
            }}
          />
          {/*
            Icon-only below `sm`: this button sits beside the textarea, and at
            320px a spelled-out "Remove" was taking a third of the row from the
            text being edited. It keeps its accessible name at every width.
          */}
          <button
            type="button"
            onClick={() => onChange(values.filter((_, position) => position !== index))}
            className="touch-target mt-1 inline-flex shrink-0 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-surface-subtle hover:text-rose-600 dark:hover:text-rose-400"
            aria-label={`Remove ${addLabel.toLowerCase()} ${index + 1}`}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Remove</span>
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...values, ""])}
        className="self-start rounded-md border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-accent/50 hover:text-accent"
      >
        + Add {addLabel.toLowerCase()}
      </button>
    </div>
  );
}
