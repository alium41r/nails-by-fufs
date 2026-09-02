import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "accent" | "outline" | "ghost" | "link";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  href?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      href,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium tracking-[0.12em] uppercase transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-45 select-none";

    const variantStyles = {
      primary:
        "bg-foreground text-background hover:opacity-90 active:scale-[0.99] shadow-xs",
      accent:
        "bg-accent text-accent-foreground hover:bg-accent-hover active:scale-[0.99] shadow-xs",
      outline:
        "border border-border bg-transparent text-foreground hover:border-foreground/40 hover:bg-surface-subtle active:scale-[0.99]",
      ghost:
        "bg-transparent text-foreground hover:bg-surface-subtle active:scale-[0.99]",
      link:
        "bg-transparent text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground p-0 h-auto font-normal tracking-normal lowercase first-letter:uppercase",
    };

    const sizeStyles = {
      sm: "h-9 px-4 text-[11px] min-w-[36px]",
      md: "h-11 px-6 text-xs min-h-[44px]", // 44px mobile touch target
      lg: "h-13 px-8 text-xs sm:text-sm min-h-[48px]",
    };

    const content = (
      <>
        {isLoading && (
          <svg
            className="mr-2 h-4 w-4 animate-spin text-current opacity-80"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!isLoading && leftIcon && (
          <span className="mr-2 inline-flex items-center">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && (
          <span className="ml-2 inline-flex items-center">{rightIcon}</span>
        )}
      </>
    );

    const mergedClassName = cn(
      baseStyles,
      variantStyles[variant],
      variant !== "link" && sizeStyles[size],
      fullWidth && "w-full",
      className
    );

    if (href) {
      return (
        <Link href={href} className={mergedClassName}>
          {content}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={mergedClassName}
        {...props}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = "Button";
