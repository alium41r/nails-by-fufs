import React from "react";
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
