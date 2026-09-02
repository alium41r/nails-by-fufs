"use client";

import React, { useSyncExternalStore } from "react";
import { useTheme } from "@/providers/ThemeProvider";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => {};

interface ThemeToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "icon" | "pill";
}

export function ThemeToggle({
  className,
  variant = "icon",
  ...props
}: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const isDark = mounted ? resolvedTheme === "dark" : true;
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={label}
        className={cn(
          "inline-flex items-center justify-between gap-3 px-3.5 py-2 text-xs font-medium tracking-wider uppercase",
          "border border-border bg-surface text-foreground transition-colors duration-150",
          "hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent cursor-pointer",
          className
        )}
        {...props}
      >
        <span className="text-muted-foreground">Theme:</span>
        <span className="inline-flex items-center gap-1.5 text-foreground font-semibold">
          {isDark ? (
            <>
              <Moon className="h-3.5 w-3.5 text-accent" />
              <span>Dark</span>
            </>
          ) : (
            <>
              <Sun className="h-3.5 w-3.5 text-accent" />
              <span>Light</span>
            </>
          )}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={cn(
        "relative inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center text-foreground/80",
        "transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent cursor-pointer",
        className
      )}
      {...props}
    >
      {isDark ? (
        <Sun className="h-4 w-4 transition-transform duration-200 rotate-0 scale-100 text-accent" />
      ) : (
        <Moon className="h-4 w-4 transition-transform duration-200 rotate-0 scale-100 text-accent" />
      )}
      <span className="sr-only">{label}</span>
    </button>
  );
}
