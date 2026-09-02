import React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      id,
      disabled,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-xs font-medium tracking-wider uppercase text-foreground/80"
          >
            {label}
          </label>
        )}

        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          disabled={disabled}
          className={cn(
            "w-full p-3.5 bg-surface text-foreground placeholder:text-muted-foreground/50 text-sm leading-relaxed",
            "border border-border transition-colors duration-150 resize-y",
            "focus-visible:outline-none focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent",
            "disabled:bg-surface-subtle disabled:text-muted-foreground disabled:cursor-not-allowed",
            error && "border-rose-600 focus-visible:border-rose-600 focus-visible:ring-rose-600",
            className
          )}
          {...props}
        />

        {error && (
          <p className="text-xs text-rose-600 mt-0.5">{error}</p>
        )}
        {!error && helperText && (
          <p className="text-xs text-muted-foreground mt-0.5">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
