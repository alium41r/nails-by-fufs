"use client";

import React, { createContext, useContext, useEffect, useSyncExternalStore, useCallback } from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = "nails-by-fufs-theme";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSnapshot(): Theme {
  if (typeof window === "undefined") return "dark";
  const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
  return saved === "light" || saved === "dark" ? saved : "dark";
}

function getServerSnapshot(): Theme {
  return "dark";
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("storage", callback);
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const applyTheme = useCallback((targetTheme: Theme) => {
    if (typeof document === "undefined") return "dark";
    const root = document.documentElement;
    const actualTheme: ResolvedTheme = targetTheme === "light" ? "light" : "dark";

    if (actualTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    root.setAttribute("data-theme", actualTheme);
    return actualTheme;
  }, []);

  // Update DOM when theme changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem(STORAGE_KEY, newTheme);
    window.dispatchEvent(new Event("storage"));
    applyTheme(newTheme);
  };

  const isDark =
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : theme !== "light";
  const resolvedTheme: ResolvedTheme = isDark ? "dark" : "light";

  const toggleTheme = () => {
    const currentIsDark =
      typeof document !== "undefined"
        ? document.documentElement.classList.contains("dark")
        : theme === "dark";
    const nextTheme: Theme = currentIsDark ? "light" : "dark";
    setTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
