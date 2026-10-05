"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, TriangleAlert, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Calm feedback for admin actions.
 *
 * ## Why success is a toast and failure is not
 *
 * Every admin action already redirects with `?saved=` or `?error=`, and the
 * previous single component rendered both as a full-width banner at the top of
 * the page. A permanent success banner is noise — it occupies the same visual
 * weight as a problem, stays until the owner navigates, and in a form-heavy
 * screen it pushes the content down on every single save.
 *
 * So the two are treated differently, by how much they need from the reader:
 *
 *   - **success** → a small toast, bottom-right, auto-dismissed. Confirms without
 *     competing.
 *   - **failure** → stays on screen until dismissed, at the top of the content,
 *     because a failure is something the owner must actually act on.
 *
 * ## Why it clears the URL
 *
 * `router.replace` strips the query parameter after reading it, so a reload does
 * not re-announce a save that happened minutes ago, and the back button does not
 * walk through a history of toasts. The parameter is the transport, not the
 * state.
 */
export function AdminNotice({ saved: savedProp, error: errorProp }: { saved?: string; error?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Either supplied by the page or read from the redirect parameters. The layout
  // renders this once for the whole admin, so pages no longer have to remember to
  // place it.
  const saved = savedProp ?? searchParams.get("saved") ?? undefined;
  const error = errorProp ?? searchParams.get("error") ?? undefined;

  const [dismissed, setDismissed] = useState(false);
  const [toastVisible, setToastVisible] = useState(Boolean(saved) && !error);

  // Drop the transport parameter once it has been read, keeping every other
  // parameter (filters, tab, sort) exactly as it was.
  useEffect(() => {
    if (!saved && !error) return;
    const next = new URLSearchParams(searchParams.toString());
    next.delete("saved");
    next.delete("error");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [saved, error, pathname, router, searchParams]);

  useEffect(() => {
    if (!toastVisible) return;
    const timer = window.setTimeout(() => setToastVisible(false), 4500);
    return () => window.clearTimeout(timer);
  }, [toastVisible]);

  if (error && !dismissed) {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
      >
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="min-w-0 flex-1 leading-relaxed">{error}</p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="shrink-0 rounded p-0.5 text-rose-500 transition-colors hover:text-rose-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (!saved || !toastVisible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[70] flex justify-center sm:inset-x-auto sm:right-6 sm:bottom-6 sm:justify-end"
    >
      <div className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-border bg-surface py-2.5 pr-3 pl-4 text-sm text-foreground shadow-lg">
        <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        <span className="max-w-[22rem] leading-snug">{saved}</span>
        <button
          type="button"
          onClick={() => setToastVisible(false)}
          aria-label="Dismiss"
          className={cn(
            "shrink-0 rounded-full p-0.5 text-muted-foreground transition-colors",
            "hover:bg-surface-subtle hover:text-foreground",
          )}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
