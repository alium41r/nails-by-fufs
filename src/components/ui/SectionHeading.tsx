import React from "react";
import { cn } from "@/lib/utils";

export interface SectionHeadingProps extends React.HTMLAttributes<HTMLDivElement> {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center" | "right";
  size?: "sm" | "md" | "lg";
  action?: React.ReactNode;
}

export function SectionHeading({
  className,
  eyebrow,
  title,
  subtitle,
  align = "left",
  size = "md",
  action,
  ...props
}: SectionHeadingProps) {
  const alignClasses = {
    left: "text-left items-start",
    center: "text-center items-center mx-auto",
    right: "text-right items-end ml-auto",
  };

  const titleSizes = {
    sm: "text-2xl sm:text-3xl",
    md: "text-3xl sm:text-4xl lg:text-5xl",
    lg: "text-4xl sm:text-5xl lg:text-6xl",
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 sm:gap-3",
        alignClasses[align],
        align === "center" && "max-w-2xl",
        className
      )}
      {...props}
    >
      <div className="w-full flex items-center justify-between gap-4">
        <div className={cn("flex flex-col gap-1.5", alignClasses[align])}>
          {eyebrow && (
            <span className="eyebrow inline-block text-accent">
              {eyebrow}
            </span>
          )}
          <h2
            className={cn(
              "font-display font-light tracking-tight text-foreground leading-[1.15]",
              titleSizes[size]
            )}
          >
            {title}
          </h2>
        </div>
        {action && <div className="shrink-0 hidden sm:block">{action}</div>}
      </div>

      {subtitle && (
        <p className="text-sm sm:text-base text-muted-foreground font-normal leading-relaxed max-w-xl">
          {subtitle}
        </p>
      )}

      {action && <div className="sm:hidden pt-2">{action}</div>}
    </div>
  );
}
